import {
  Bell,
  Bot,
  Bug,
  Building2,
  BarChart2,
  Calendar,
  CheckSquare,
  ClipboardList,
  FileBarChart,
  FileText,
  Folder,
  FolderKanban,
  GraduationCap,
  Home,
  Inbox,
  Landmark,
  LayoutDashboard,
  LineChart,
  TrendingUp,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Radio,
  Settings,
  User,
  UserPlus,
  Users,
  Clock,
  Search,
  LayoutGrid,
  List,
  ArrowLeft,
  Maximize2,
  Plus
} from 'lucide-react'

/** @type {Record<string, import('lucide-react').LucideIcon>} */
export const APP_ICONS = {
  home: Home,
  dashboard: LayoutDashboard,
  tasks: CheckSquare,
  projects: FolderKanban,
  documents: FileText,
  requests: Inbox,
  monitoring: LineChart,
  statistics: BarChart2,
  calendar: Calendar,
  announcements: Megaphone,
  reports: FileBarChart,
  analytics: TrendingUp,
  notifications: Bell,
  team: Users,
  activities: ClipboardList,
  departments: Building2,
  'account-requests': Mail,
  'add-account': UserPlus,
  'manage-users': Settings,
  profile: User,
  bug: Bug,
  feedback: MessageSquare,
  logout: LogOut,
  'map-pin': MapPin,
  folder: Folder,
  file: FileText,
  campus: Landmark,
  molsa: GraduationCap,
  iot: Radio,
  chat: MessageCircle,
  bot: Bot,
  deadlines: Clock,
  search: Search,
  grid: LayoutGrid,
  list: List,
  arrowLeft: ArrowLeft,
  maximize: Maximize2,
  plus: Plus
}

/**
 * Simple stroke icons for a consistent UI (Lucide).
 * @param {{ name: string, size?: number, strokeWidth?: number, className?: string }} props
 */
export default function AppIcon({ name, size = 20, strokeWidth = 1.75, className = '' }) {
  const Icon = APP_ICONS[name]
  if (!Icon) return null
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={`app-icon ${className}`.trim()}
      aria-hidden
    />
  )
}
