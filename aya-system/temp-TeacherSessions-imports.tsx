import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog, FormRow } from "@/components/ui/form-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  UserCheck,
  Clock,
  Edit,
  Trash2,
  CalendarRange,
  AlarmClock,
  CalendarClock,
  BookOpen,
  Plus,
  FileText,
  Search,
  Check
} from "lucide-react";
import { getStudyCirclesByTeacherId, getAllStudyCircles } from "@/lib/study-circle-service";
import { getSessionsByCircleId, createSession, updateSession, deleteSession } from "@/lib/circle-session-service";
import { getteachers } from "@/lib/profile-service";
import { Badge } from "@/components/ui/badge";
import { format, isAfter, parseISO, startOfToday, addDays } from "date-fns";
import { arSA } from "date-fns/locale";
import { GenericTable } from "@/components/ui/generic-table";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { CircleSessionData } from "@/types/circle-session";

type TeacherSessionsProps = {
  onNavigate: (page: string) => void;
  currentUser: any;
};
