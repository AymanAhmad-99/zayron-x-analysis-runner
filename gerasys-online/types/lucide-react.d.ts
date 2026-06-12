/// <reference types="react" />

declare module 'lucide-react/dist/esm/icons/*.js' {
  interface LucideIconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
  }
  const icon: React.FC<LucideIconProps>;
  export default icon;
}
