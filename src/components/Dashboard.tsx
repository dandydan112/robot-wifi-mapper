import { Plus, Building2, Calendar, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Project } from '../types';

interface DashboardProps {
  projects: Project[];
  onCreateProject: () => void;
  onSelectProject: (project: Project) => void;
}

export function Dashboard({ projects, onCreateProject, onSelectProject }: DashboardProps) {
  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'measuring':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'draft':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return 'Færdig';
      case 'measuring':
        return 'I gang';
      case 'draft':
        return 'Kladde';
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="mb-2">WiFi Dækningsanalyse</h1>
            <p className="text-muted-foreground">
              Oversigt over alle projekter og målinger
            </p>
          </div>
          <Button onClick={onCreateProject} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Opret nyt projekt
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Totale projekter</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{projects.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Aktive målinger</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">
                {projects.filter(p => p.status === 'measuring').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Færdige projekter</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">
                {projects.filter(p => p.status === 'completed').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Grid */}
        <div>
          <h2 className="mb-4">Projekter</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <Card
                key={project.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => onSelectProject(project)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base mb-1">{project.name}</CardTitle>
                      <CardDescription>{project.building}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(project.status)} variant="secondary">
                      {getStatusText(project.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {project.description}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    Opdateret: {project.updatedAt.toLocaleDateString('da-DK')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
