import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: {
    value: string;
    label: string;
    positive?: boolean;
  };
  valueColor?: string;
}

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  valueColor = "text-foreground" 
}: StatsCardProps) {
  return (
    <Card data-testid={`stats-${title.toLowerCase()}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1" data-testid={`stats-title-${title.toLowerCase()}`}>
              {title}
            </p>
            <p className={`text-3xl font-bold ${valueColor}`} data-testid={`stats-value-${title.toLowerCase()}`}>
              {value}
            </p>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="text-primary text-xl h-6 w-6" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center text-sm">
            <span className={`font-medium ${trend.positive !== false ? 'text-success' : 'text-destructive'}`}>
              {trend.value}
            </span>
            <span className="text-muted-foreground ml-1">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
