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
  add,
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Calendar as CalendarIcon, Users, BookOpen, Building, PlusCircle } from 'lucide-react';
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
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';


// Mock data for filters
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

const chartConfig = {
  visits: {
    label: 'Visits',
  },
  'College of Engineering': {
    label: 'Engineering',
    color: 'hsl(var(--chart-1))',
  },
  'College of Science': {
    label: 'Science',
    color: 'hsl(var(--chart-2))',
  },
  'College of Arts & Humanities': {
    label: 'Arts & Humanities',
    color: 'hsl(var(--chart-3))',
  },
  'Business School': {
    label: 'Business',
    color: 'hsl(var(--chart-4))',
  },
    'Other': {
    label: 'Other',
    color: 'hsl(var(--chart-5))',
  },
} satisfies ChartConfig;


export default function AdminDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLogVisitOpen, setIsLogVisitOpen] = useState(false);

  // Filters State
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [reasonFilter, setReasonFilter] = useState('All');
  const [collegeFilter, setCollegeFilter] = useState('All');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('all');

  // Data Fetching
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
      const reasonMatch =
        reasonFilter === 'All' || visit.reason === reasonFilter;
      const collegeMatch =
        collegeFilter === 'All' || visit.college === collegeFilter;
      const employeeMatch =
        employeeStatusFilter === 'all' ||
        (employeeStatusFilter === 'employee' && visit.isEmployee) ||
        (employeeStatusFilter === 'student' && !visit.isEmployee);
      return reasonMatch && collegeMatch && employeeMatch;
    });
  }, [rawVisits, reasonFilter, collegeFilter, employeeStatusFilter]);

  const stats = useMemo(() => {
    const totalVisits = filteredVisits.length;
    const visitsByCollege = filteredVisits.reduce((acc, visit) => {
      acc[visit.college] = (acc[visit.college] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const chartData = Object.keys(visitsByCollege).map(college => ({
        college,
        ...colleges.slice(1).reduce((acc, col) => {
            acc[col] = col === college ? visitsByCollege[college] : 0;
            return acc;
        }, {} as {[key: string]: number})
    }));

    // This aggregation is complex for a simple chart. A better format:
    const simpleChartData = [{
        name: "Visits",
        ...visitsByCollege
    }];


    return { totalVisits, simpleChartData };
  }, [filteredVisits]);


  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    const checkAdminStatus = async () => {
      if (!firestore || !user) return;
      const adminRoleRef = doc(firestore, 'roles_libraryAdmins', user.uid);
      const docSnap = await getDoc(adminRoleRef);
      if (docSnap.exists()) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        router.push('/dashboard');
      }
    };
    checkAdminStatus();
  }, [user, isUserLoading, router, firestore]);

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
    const newVisit = {
      ...values,
      visitTimestamp: new Date(),
    };
    await addDocumentNonBlocking(visitsCollectionRef, newVisit);
    toast({
      title: 'Success!',
      description: 'Visit has been logged.',
    });
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
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
         <h1 className="text-2xl font-bold">Admin Dashboard</h1>
         <div className="ml-auto flex items-center gap-2">
            <Button onClick={() => setIsLogVisitOpen(true)}><PlusCircle className="mr-2"/> Log Visit</Button>
            <Button onClick={handleSignOut} variant="outline">Sign Out</Button>
         </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <Card>
            <CardHeader>
                <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Date Range Picker */}
                <div className="grid gap-2">
                    <Label>Date Range</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={'outline'}
                            className={cn(
                            'justify-start text-left font-normal',
                            !date && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                            date.to ? (
                                <>
                                {format(date.from, 'LLL dd, y')} -{' '}
                                {format(date.to, 'LLL dd, y')}
                                </>
                            ) : (
                                format(date.from, 'LLL dd, y')
                            )
                            ) : (
                            <span>Pick a date</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                {/* Reason Filter */}
                <div className="grid gap-2">
                    <Label>Reason for Visit</Label>
                    <Select value={reasonFilter} onValueChange={setReasonFilter}>
                        <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                        <SelectContent>
                            {visitReasons.map(reason => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                {/* College Filter */}
                <div className="grid gap-2">
                    <Label>College</Label>
                    <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                        <SelectTrigger><SelectValue placeholder="Select a college" /></SelectTrigger>
                        <SelectContent>
                             {colleges.map(college => <SelectItem key={college} value={college}>{college}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                {/* Employee Status Filter */}
                <div className="grid gap-2">
                    <Label>Employee Status</Label>
                    <Select value={employeeStatusFilter} onValueChange={setEmployeeStatusFilter}>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="employee">Teacher/Staff</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 my-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground"/>
                </CardHeader>
                <CardContent>
                    {isLoading ? <p>Loading...</p> : <div className="text-2xl font-bold">{stats.totalVisits}</div>}
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Visits by College</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
                {isLoading ? <p>Loading chart data...</p> : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                            <BarChart accessibilityLayer data={stats.simpleChartData}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {colleges.slice(1).map(college => (
                                    <Bar key={college} dataKey={college} fill={chartConfig[college]?.color} radius={4} />
                                ))}
                            </BarChart>
                        </ChartContainer>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
      </main>

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
                                <FormLabel>Visitor Name (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter visitor's name" {...field} />
                                </FormControl>
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
                                        {visitReasons.slice(1).map(reason => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}
                                    </SelectContent>
                                </Select>
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
                                        {colleges.slice(1).map(college => <SelectItem key={college} value={college}>{college}</SelectItem>)}
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
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Teacher or Staff?</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
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

    