'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Calendar as CalendarIcon, Users, BookOpen, Building, PlusCircle, GraduationCap, Briefcase } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  useAuth,
  useFirestore,
  useUser,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
} from '@/firebase';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const colleges = [
  'All',
  'College of Engineering',
  'College of Science',
  'College of Arts & Humanities',
  'Business School',
  'Other',
];

const visitReasons = [
  'All',
  'Studying',
  'Borrowing Books',
  'Research',
  'Events',
  'Other',
];

const logVisitSchema = z.object({
  visitorName: z.string().optional(),
  reason: z.string().min(1, { message: 'Reason for visit is required.' }),
  college: z.string().min(1, { message: 'College is required.' }),
  isEmployee: z.boolean(),
});

type VisitData = {
  id: string;
  visitorName?: string;
  visitTimestamp: Timestamp;
  reason: string;
  college: string;
  isEmployee: boolean;
};

type DatePreset = 'today' | 'week' | 'custom';

export default function AdminDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLogVisitOpen, setIsLogVisitOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [reasonFilter, setReasonFilter] = useState('All');
  const [collegeFilter, setCollegeFilter] = useState('All');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('all');

  // Handle preset changes
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'today') {
      setDate({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
    } else if (preset === 'week') {
      setDate({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) });
    }
  };

  const visitsCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'visits') : null),
    [firestore]
  );

  const visitsQuery = useMemoFirebase(() => {
    if (!visitsCollectionRef || !date?.from || !date?.to) return null;
    return query(
      visitsCollectionRef,
      where('visitTimestamp', '>=', date.from),
      where('visitTimestamp', '<=', date.to)
    );
  }, [visitsCollectionRef, date]);

  const { data: rawVisits, isLoading } = useCollection<VisitData>(visitsQuery);

  const filteredVisits = useMemo(() => {
    if (!rawVisits) return [];
    return rawVisits.filter((visit) => {
      const reasonMatch = reasonFilter === 'All' || visit.reason === reasonFilter;
      const collegeMatch = collegeFilter === 'All' || visit.college === collegeFilter;
      const employeeMatch =
        employeeStatusFilter === 'all' ||
        (employeeStatusFilter === 'employee' && visit.isEmployee) ||
        (employeeStatusFilter === 'student' && !visit.isEmployee);
      return reasonMatch && collegeMatch && employeeMatch;
    });
  }, [rawVisits, reasonFilter, collegeFilter, employeeStatusFilter]);

  const stats = useMemo(() => {
    const totalVisits = filteredVisits.length;
    const employeeVisits = filteredVisits.filter(v => v.isEmployee).length;
    const studentVisits = filteredVisits.filter(v => !v.isEmployee).length;

    // Chart data by college
    const visitsByCollege = filteredVisits.reduce((acc, visit) => {
      acc[visit.college] = (acc[visit.college] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const collegeChartData = Object.entries(visitsByCollege).map(([college, count]) => ({
      college: college.replace('College of ', '').replace(' & Humanities', ''),
      visits: count,
    }));

    // Chart data by reason
    const visitsByReason = filteredVisits.reduce((acc, visit) => {
      acc[visit.reason] = (acc[visit.reason] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const reasonChartData = Object.entries(visitsByReason).map(([reason, count]) => ({
      reason,
      visits: count,
    }));

    return { totalVisits, employeeVisits, studentVisits, collegeChartData, reasonChartData };
  }, [filteredVisits]);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const verifyAdmin = async () => {
      if (!firestore) return;
      const isAdminByEmail =
        user.email === 'jcesperanza@neu.edu.ph' ||
        user.email === 'alvin.antoniojr@neu.edu.ph';
      const adminRoleRef = doc(firestore, 'roles_libraryAdmins', user.uid);
      const adminDoc = await getDoc(adminRoleRef);
      const hasAdminRole = adminDoc.exists();

      if (isAdminByEmail || hasAdminRole) {
        setIsAdmin(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to access the admin dashboard.',
        });
        setIsAdmin(false);
        router.push('/dashboard');
      }
    };

    verifyAdmin();
  }, [user, isUserLoading, router, firestore, toast]);

  const handleSignOut = () => {
    if (auth) auth.signOut();
    router.push('/');
  };

  const logVisitForm = useForm<z.infer<typeof logVisitSchema>>({
    resolver: zodResolver(logVisitSchema),
    defaultValues: {
      visitorName: '',
      reason: '',
      college: '',
      isEmployee: false,
    },
  });

  async function onLogVisitSubmit(values: z.infer<typeof logVisitSchema>) {
    if (!visitsCollectionRef) return;
    await addDocumentNonBlocking(visitsCollectionRef, {
      ...values,
      visitTimestamp: new Date(),
    });
    toast({ title: 'Success!', description: 'Visit has been logged.' });
    logVisitForm.reset();
    setIsLogVisitOpen(false);
  }

  if (isUserLoading || isAdmin === null || !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => setIsLogVisitOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Log Visit
          </Button>
          <Button onClick={handleSignOut} variant="outline">Sign Out</Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">

        {/* Date Range Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">View by:</span>
          <Button
            variant={datePreset === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetChange('today')}
          >
            Today
          </Button>
          <Button
            variant={datePreset === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetChange('week')}
          >
            This Week
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={datePreset === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDatePreset('custom')}
                className={cn('justify-start text-left font-normal', !date && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from && date?.to
                  ? `${format(date.from, 'MMM d')} – ${format(date.to, 'MMM d, yyyy')}`
                  : 'Custom Range'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDate({ from: startOfDay(range.from), to: endOfDay(range.to) });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Additional Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Filter by:</span>

          <Select value={reasonFilter} onValueChange={setReasonFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Reason for Visit" />
            </SelectTrigger>
            <SelectContent>
              {visitReasons.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={collegeFilter} onValueChange={setCollegeFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="College" />
            </SelectTrigger>
            <SelectContent>
              {colleges.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={employeeStatusFilter} onValueChange={setEmployeeStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Visitor Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Visitors</SelectItem>
              <SelectItem value="employee">Employees Only</SelectItem>
              <SelectItem value="student">Students Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.totalVisits}</div>
              <p className="text-xs text-muted-foreground mt-1">Within selected period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Student Visits</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.studentVisits}</div>
              <p className="text-xs text-muted-foreground mt-1">Non-employee visitors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Employee Visits</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.employeeVisits}</div>
              <p className="text-xs text-muted-foreground mt-1">Teachers & staff</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* Visits by College */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visits by College</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.collegeChartData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
                  No data for selected filters
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.collegeChartData} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="college" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Visits by Reason */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visits by Reason</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.reasonChartData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
                  No data for selected filters
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.reasonChartData} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="reason" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="visits" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

      </main>

      {/* Log Visit Modal */}
      <Dialog open={isLogVisitOpen} onOpenChange={setIsLogVisitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log New Visit</DialogTitle>
            <DialogDescription>
              Enter the details for the new visit. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...logVisitForm}>
            <form onSubmit={logVisitForm.handleSubmit(onLogVisitSubmit)} className="space-y-4">
              
              <FormField
                control={logVisitForm.control}
                name="visitorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visitor Name (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Juan dela Cruz" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={logVisitForm.control}
                name="college"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>College</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a college" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colleges.filter(c => c !== 'All').map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={logVisitForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Visit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {visitReasons.filter(r => r !== 'All').map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={logVisitForm.control}
                name="isEmployee"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Employee?</FormLabel>
                      <p className="text-xs text-muted-foreground">Toggle on if visitor is a teacher or staff</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit">Save Visit</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}