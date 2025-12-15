#!/usr/bin/env python3
"""
WiFi Heatmap Generator
Adapted from python-wifi-survey-heatmap for robot-wifi-mapper
Generates heatmap images from WiFi measurement data
"""

import sys
import json
import argparse
import logging
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.cm as cm
from scipy.interpolate import Rbf
from PIL import Image
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


class HeatmapGenerator:
    """Generate WiFi signal strength heatmap overlays"""
    
    def __init__(self, floorplan_path, measurements, output_path, 
                 metric='rssi', cmap='RdYlGn', style='contour', vmin=None, vmax=None):
        """
        Initialize heatmap generator
        
        Args:
            floorplan_path: Path to floor plan image
            measurements: List of measurement dicts with x, y, and signal data
            output_path: Path to save generated heatmap
            metric: Which metric to visualize (rssi, signalStrength)
            cmap: Matplotlib colormap name
            style: Visualization style ('contour' or 'smooth')
            vmin: Minimum value for color scale
            vmax: Maximum value for color scale
        """
        self.floorplan_path = floorplan_path
        self.measurements = measurements
        self.output_path = output_path
        self.metric = metric
        self.cmap = cmap
        self.style = style
        self.vmin = vmin
        self.vmax = vmax
        self._load_floorplan()
        
    def _load_floorplan(self):
        """Load floor plan image and get dimensions"""
        try:
            img = Image.open(self.floorplan_path)
            self.image_width = img.width
            self.image_height = img.height
            self.floorplan = np.array(img)
            logger.info(f"Loaded floor plan: {self.image_width}x{self.image_height}")
        except Exception as e:
            logger.error(f"Failed to load floor plan: {e}")
            raise
    
    def _extract_data(self):
        """Extract x, y coordinates and signal values from measurements"""
        x_coords = []
        y_coords = []
        values = []
        
        for m in self.measurements:
            # Get coordinates
            x = m.get('x')
            y = m.get('y')
            
            # Get signal value - try multiple field names
            signal = None
            if self.metric == 'rssi':
                signal = m.get('rssi') or m.get('signalStrength')
                if signal is None and m.get('readings'):
                    readings = m.get('readings', [])
                    if readings and len(readings) > 0:
                        signal = readings[0].get('rssi') or readings[0].get('signal_level')
            
            if x is not None and y is not None and signal is not None:
                x_coords.append(float(x))
                y_coords.append(float(y))
                values.append(float(signal))
        
        logger.info(f"Extracted {len(x_coords)} valid measurement points")
        return np.array(x_coords), np.array(y_coords), np.array(values)
    
    def generate(self):
        """Generate and save heatmap image"""
        x, y, values = self._extract_data()
        
        if len(x) < 3:
            logger.error("Need at least 3 measurement points to generate heatmap")
            return False
        
        # Remove duplicate or very close points to avoid singular matrix
        min_distance = 5.0  # Minimum distance in pixels
        unique_points = []
        unique_values = []
        
        for i in range(len(x)):
            is_unique = True
            for j in range(len(unique_points)):
                dist = np.sqrt((x[i] - unique_points[j][0])**2 + (y[i] - unique_points[j][1])**2)
                if dist < min_distance:
                    is_unique = False
                    # Average values for nearby points
                    unique_values[j] = (unique_values[j] + values[i]) / 2
                    break
            if is_unique:
                unique_points.append([x[i], y[i]])
                unique_values.append(values[i])
        
        x = np.array([p[0] for p in unique_points])
        y = np.array([p[1] for p in unique_points])
        values = np.array(unique_values)
        
        logger.info(f"Using {len(x)} unique measurement points after deduplication")
        
        if len(x) < 3:
            logger.error("Need at least 3 unique measurement points to generate heatmap")
            return False
        
        # Add corner points with extrapolated values
        corners_x = [0, 0, self.image_width, self.image_width]
        corners_y = [0, self.image_height, 0, self.image_height]
        corner_values = [np.min(values)] * 4
        
        x = np.concatenate([x, corners_x])
        y = np.concatenate([y, corners_y])
        values = np.concatenate([values, corner_values])
        
        # Create interpolation grid
        grid_resolution = max(self.image_width, self.image_height) // 4
        xi = np.linspace(0, self.image_width, grid_resolution)
        yi = np.linspace(0, self.image_height, grid_resolution)
        xi_grid, yi_grid = np.meshgrid(xi, yi)
        
        # Perform RBF interpolation with robust settings
        logger.info("Performing radial basis function interpolation...")
        try:
            # Try multiquadric first (more robust), fallback to linear
            try:
                rbf = Rbf(x, y, values, function='multiquadric', smooth=0.5)
                zi = rbf(xi_grid, yi_grid)
            except:
                logger.info("Multiquadric failed, trying linear with smoothing")
                rbf = Rbf(x, y, values, function='linear', smooth=1.0)
                zi = rbf(xi_grid, yi_grid)
        except Exception as e:
            logger.error(f"Interpolation failed: {e}")
            return False
        
        # Determine value range
        vmin = self.vmin if self.vmin is not None else np.min(values)
        vmax = self.vmax if self.vmax is not None else np.max(values)
        logger.info(f"Value range: {vmin} to {vmax}")
        
        # Create figure with proper DPI for high quality
        dpi = 100
        fig_width = self.image_width / dpi
        fig_height = self.image_height / dpi
        
        fig, ax = plt.subplots(figsize=(fig_width, fig_height), dpi=dpi)
        ax.set_xlim(0, self.image_width)
        ax.set_ylim(self.image_height, 0)  # Flip Y axis
        ax.axis('off')
        
        # Draw floor plan
        ax.imshow(self.floorplan, extent=[0, self.image_width, self.image_height, 0], 
                  zorder=1, alpha=1.0)
        
        # Render based on selected style
        if self.style == 'contour':
            # Contour style: filled contours + white lines + blue dots
            # Draw filled contours for smooth color transitions
            levels = 20  # Number of contour levels
            contourf = ax.contourf(xi_grid, yi_grid, zi, levels=levels, 
                                   cmap=self.cmap, alpha=0.5, 
                                   vmin=vmin, vmax=vmax, 
                                   extend='both', zorder=2)
            
            # Draw contour lines for better definition
            contour_lines = ax.contour(xi_grid, yi_grid, zi, levels=10, 
                                       colors='white', alpha=0.3, 
                                       linewidths=0.5, zorder=3)
            
            # Draw measurement points with blue circles and white borders (like the example)
            for px, py in zip(x[:-4], y[:-4]):  # Exclude corners
                # Blue dots with white border like in the example
                ax.plot(px, py, 'o', markersize=6, 
                       markeredgewidth=2, markeredgecolor='white', 
                       markerfacecolor='#2563eb', zorder=4)
            
            # Add colorbar for contour plot
            cbar = fig.colorbar(contourf, ax=ax, fraction=0.046, pad=0.04)
        else:
            # Smooth style: gradient + colored dots by signal strength
            heatmap = ax.imshow(zi, extent=[0, self.image_width, self.image_height, 0],
                               origin='upper', cmap=self.cmap, 
                               vmin=vmin, vmax=vmax,
                               alpha=0.6, zorder=2)
            
            # Add measurement points colored by signal strength
            # Exclude corners from visualization
            for px, py, val in zip(x[:-4], y[:-4], values[:-4]):
                norm_val = (val - vmin) / (vmax - vmin) if vmax != vmin else 0.5
                color = plt.colormaps[self.cmap](norm_val)
                ax.plot(px, py, 'o', markersize=6,
                       markeredgewidth=1.5, markeredgecolor='white',
                       markerfacecolor=color, zorder=3, alpha=1.0)
            
            # Add colorbar for smooth plot
            cbar = fig.colorbar(heatmap, ax=ax, fraction=0.046, pad=0.04)
        
        cbar.set_label('Signal Strength (dBm)', rotation=270, labelpad=20)
        
        # Save with tight layout
        plt.tight_layout(pad=0)
        plt.savefig(self.output_path, dpi=dpi, bbox_inches='tight', pad_inches=0)
        plt.close(fig)
        
        logger.info(f"Heatmap saved to {self.output_path}")
        return True


def main():
    parser = argparse.ArgumentParser(description='Generate WiFi heatmap from measurements')
    parser.add_argument('--floorplan', required=True, help='Path to floor plan image')
    parser.add_argument('--measurements', required=True, help='Path to measurements JSON file')
    parser.add_argument('--output', required=True, help='Output path for heatmap image')
    parser.add_argument('--metric', default='rssi', help='Metric to visualize (default: rssi)')
    parser.add_argument('--cmap', default='RdYlGn', help='Colormap name (default: RdYlGn)')
    parser.add_argument('--style', default='contour', choices=['contour', 'smooth'],
                       help='Visualization style: contour (with lines) or smooth (gradient)')
    parser.add_argument('--vmin', type=float, help='Minimum value for color scale')
    parser.add_argument('--vmax', type=float, help='Maximum value for color scale')
    
    args = parser.parse_args()
    
    # Load measurements
    try:
        with open(args.measurements, 'r') as f:
            data = json.load(f)
            measurements = data if isinstance(data, list) else data.get('measurements', [])
    except Exception as e:
        logger.error(f"Failed to load measurements: {e}")
        sys.exit(1)
    
    # Generate heatmap
    generator = HeatmapGenerator(
        args.floorplan,
        measurements,
        args.output,
        metric=args.metric,
        cmap=args.cmap,
        style=args.style,
        vmin=args.vmin,
        vmax=args.vmax
    )
    
    success = generator.generate()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
