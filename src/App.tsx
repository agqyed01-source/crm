import { useState, useEffect } from "react";
import Papa from "papaparse";
import { 
  Building2, Users, Globe2, MessageCircle, Mail, PhoneCall,
  LogOut, LayoutDashboard, Settings, MoreVertical, Plus, Upload, 
  FileSpreadsheet, Shield
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useAuth } from './AuthContext';
import Login from './Login';
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firebaseUtils';

type Customer = {
  id: string;
  name: string;
  company: string;
  country: string;
  phone: string;
  email: string;
  status: 'In Pool' | 'Claimed' | 'Following Up' | 'Negotiating' | 'Closed';
  salesRepId?: string | null;
  lastFollowUp?: string;
  daysUntilRelease?: number;
  createdAt?: number;
  updatedAt?: number;
};

type AppUser = {
  uid: string;
  displayName: string;
  email: string;
  role: string;
};

const ALL_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "USA", "Uganda", "UK", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export default function App() {
  const { user, role, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("my-leads");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [dashboardImportOpen, setDashboardImportOpen] = useState(false);
  const [poolImportOpen, setPoolImportOpen] = useState(false);
  
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const unsubscribeCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Customer);
      setCustomers(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "customers"));

    let unsubscribeUsers = () => {};
    if (role === 'admin' || role === 'manager') {
       unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
         const data = snapshot.docs.map(d => d.data() as AppUser);
         setAppUsers(data);
       }, (error) => handleFirestoreError(error, OperationType.LIST, "users"));
    }

    return () => {
      unsubscribeCustomers();
      unsubscribeUsers();
    };
  }, [user, role]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Login />;

  const myLeads = customers.filter(c => c.salesRepId === user.uid);
  const publicPool = customers.filter(c => c.status === 'In Pool');

  const handleImport = () => {
    if (!selectedFile) return;

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const getVal = (row: any, keywords: string[], index?: number) => {
          const key = Object.keys(row).find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
          let val = key ? row[key] : undefined;
          if (!val && index !== undefined) {
             val = Object.values(row)[index];
          }
          return typeof val === 'string' ? val.trim() : val;
        };

        const batch = writeBatch(db);
        let count = 0;
        const now = Date.now();

        for (let i = 0; i < results.data.length; i++) {
          const row = results.data[i];
          const cId = generateId();
          const docRef = doc(db, 'customers', cId);
          
          const newCustomer: Customer = {
            id: cId,
            name: getVal(row, ['name', '收件人名'], 2) || 'Unknown',
            company: getVal(row, ['company', '买家名称'], 0) || 'Unknown Company',
            country: getVal(row, ['country', 'region', '收货国家'], 3) || 'Unknown Country',
            phone: getVal(row, ['phone', 'mobile', '手机', '联系电话'], 10) || getVal(row, [], 9) || '',
            email: getVal(row, ['email', '联系邮箱'], 8) || '',
            status: 'In Pool',
            createdAt: now,
            updatedAt: now
          };
          
          batch.set(docRef, newCustomer);
          count++;
          if (count === 490) { // Batch limit is 500
             await batch.commit().catch(e => console.error("Batch error", e));
             count = 0;
          }
        }
        
        if (count > 0) {
          await batch.commit().catch(e => console.error("Batch error", e));
        }

        setSelectedFile(null);
        setDashboardImportOpen(false);
        setPoolImportOpen(false);
        setActiveTab('public-pool');
      },
      error: (error: Error) => {
        alert("Error parsing CSV: " + error.message);
      }
    });
  };

  const handleClaim = async (leadId: string) => {
    try {
      const now = Date.now();
      await updateDoc(doc(db, 'customers', leadId), {
        status: 'Following Up',
        salesRepId: user.uid,
        updatedAt: now,
        lastFollowUp: 'Just now'
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `customers/${leadId}`);
    }
  };

  const handleChangeUserRole = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: newRole,
        updatedAt: Date.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`);
    }
  };
  
  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-neutral-200 dark:border-neutral-800">
          <Globe2 className="w-6 h-6 text-blue-600 mr-2" />
          <span className="font-bold text-lg">Global CRM</span>
        </div>
        
        <div className="p-4 flex flex-col gap-2 flex-grow overflow-y-auto">
          {(role === 'admin' || role === 'manager') && (
            <Button variant={activeTab === 'dashboard' ? "secondary" : "ghost"} className="justify-start gap-2" onClick={() => setActiveTab('dashboard')}>
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Button>
          )}
          
          <Button variant={activeTab === 'my-leads' ? "secondary" : "ghost"} className="justify-start gap-2" onClick={() => setActiveTab('my-leads')}>
            <Users className="w-4 h-4" /> My Customers
            <Badge variant="secondary" className="ml-auto">{myLeads.length}</Badge>
          </Button>
          
          <Button variant={activeTab === 'public-pool' ? "secondary" : "ghost"} className="justify-start gap-2" onClick={() => setActiveTab('public-pool')}>
            <Building2 className="w-4 h-4" /> Public Pool
            <Badge variant="outline" className="ml-auto">{publicPool.length}</Badge>
          </Button>
          
          {role === 'admin' && (
            <Button variant={activeTab === 'admin-users' ? "secondary" : "ghost"} className="justify-start gap-2 mt-4" onClick={() => setActiveTab('admin-users')}>
              <Shield className="w-4 h-4" /> User Management
            </Button>
          )}
          
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold capitalize">{activeTab.replace('-', ' ')}</h1>
          
          <div className="flex items-center gap-4">
            {role !== 'admin' && <Input placeholder="Search phone or name..." className="w-64" />}
            
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <Avatar className="cursor-pointer">
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'ME'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal border-b pb-2 mb-2">
                   <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                   </div>
                </DropdownMenuLabel>
                <DropdownMenuItem className="capitalize font-semibold text-blue-600">
                   Role: {role}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 font-medium">
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'dashboard' && (role === 'admin' || role === 'manager') && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">System Dashboard</h2>
                <Dialog open={dashboardImportOpen} onOpenChange={setDashboardImportOpen}>
                  <DialogTrigger className={buttonVariants({ className: "gap-2" })}>
                    <Upload className="w-4 h-4" /> Import Customers (CSV/Excel)
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Customers</DialogTitle>
                      <DialogDescription>
                        Upload a CSV or Excel file to import customers into the system. Mapped fields will be automatically parsed.
                      </DialogDescription>
                    </DialogHeader>
                    {/* ... (Import UI omitted for brevity, keeping same logic) ... */}
                     <div className="grid gap-4 py-4">
                      <label className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50 relative">
                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".csv, .xlsx, .xls" onChange={(e) => { 
                            if(e.target.files?.length) {
                              setSelectedFile(e.target.files[0]);
                            }
                          }} />
                        <FileSpreadsheet className={`w-10 h-10 mb-4 ${selectedFile ? 'text-blue-500' : 'text-neutral-400'}`} />
                        <p className="font-medium text-sm">{selectedFile ? selectedFile.name : "Click to upload or drop"}</p>
                      </label>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setSelectedFile(null); setDashboardImportOpen(false); }}>Cancel</Button>
                      <Button disabled={!selectedFile} onClick={handleImport}>Import Now</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers in System</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{customers.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Available in Pool</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{publicPool.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Claimed Leads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">{customers.filter(c => c.status !== 'In Pool').length}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'my-leads' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Active Follow-ups</h2>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Quick Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myLeads.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-sm text-muted-foreground">{lead.company} | Last: {lead.lastFollowUp || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.country}</Badge>
                        </TableCell>
                        <TableCell>
                           <Badge variant={lead.status === 'Following Up' ? 'default' : 'secondary'}>{lead.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                              <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm", className: "gap-2" })}>
                                Contact <MoreVertical className="w-3 h-3" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`, '_blank')}>
                                  <MessageCircle className="w-4 h-4 mr-2 text-green-500" /> WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(`mailto:${lead.email}`, '_blank')}>
                                  <Mail className="w-4 h-4 mr-2 text-orange-500" /> Email
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {myLeads.length === 0 && (
                       <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                            You haven't claimed any leads yet. Go to the Public Pool to find leads.
                          </TableCell>
                       </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === 'public-pool' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Available Leads</h2>
                <div className="flex gap-2">
                   <Input 
                     placeholder="Filter by country..." 
                     className="w-48" 
                     value={countrySearch}
                     onChange={(e) => setCountrySearch(e.target.value)}
                   />
                   {(role === 'manager' || role === 'admin') && (
                     <Dialog open={poolImportOpen} onOpenChange={setPoolImportOpen}>
                       <DialogTrigger className={buttonVariants({ variant: "outline", className: "gap-2" })}>
                         <Upload className="w-4 h-4" /> Import Leads
                       </DialogTrigger>
                       <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Import Customers</DialogTitle>
                          <DialogDescription>
                            Upload a CSV or Excel file to import customers into the pool.
                          </DialogDescription>
                        </DialogHeader>
                        {/* Import UI */}
                        <div className="grid gap-4 py-4">
                          <label className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50 relative">
                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".csv, .xlsx, .xls" onChange={(e) => { 
                                if(e.target.files?.length) {
                                  setSelectedFile(e.target.files[0]);
                                }
                              }} />
                            <FileSpreadsheet className={`w-10 h-10 mb-4 ${selectedFile ? 'text-blue-500' : 'text-neutral-400'}`} />
                            <p className="font-medium text-sm">{selectedFile ? selectedFile.name : "Click to upload or drop"}</p>
                          </label>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => { setSelectedFile(null); setPoolImportOpen(false); }}>Cancel</Button>
                          <Button disabled={!selectedFile} onClick={handleImport}>Import Now</Button>
                        </DialogFooter>
                      </DialogContent>
                     </Dialog>
                   )}
                </div>
              </div>
              
              <Tabs defaultValue="countries" className="w-full">
                <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-6">
                  <TabsList className="bg-transparent p-0 flex gap-4 h-auto">
                    <TabsTrigger 
                      value="countries" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-2 py-2"
                    >
                      Countries View
                    </TabsTrigger>
                    <TabsTrigger 
                      value="list" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-2 py-2"
                    >
                      All Leads List
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="countries" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {!selectedCountry ? (
                      ALL_COUNTRIES
                        .filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
                        .map(country => {
                        const count = publicPool.filter(c => c.country.toLowerCase() === country.toLowerCase()).length;
                        return (
                          <Card key={country} className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => setSelectedCountry(country)}>
                            <CardHeader className="pb-4">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-xl flex items-center gap-2">
                                  {country}
                                </CardTitle>
                                <Badge variant={count > 0 ? "default" : "secondary"} className={`text-lg px-3 py-1 ${count > 0 ? "bg-blue-600 hover:bg-blue-700" : ""}`}>
                                  {count}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Users className="w-4 h-4" /> {count} leads available
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <>
                        <div className="col-span-full mb-2 flex items-center gap-4">
                          <Button variant="ghost" onClick={() => setSelectedCountry(null)} className="gap-2">
                            ← Back to Countries
                          </Button>
                          <h3 className="text-lg font-semibold">{selectedCountry} Leads</h3>
                        </div>
                        {publicPool.filter(c => c.country.toLowerCase() === selectedCountry.toLowerCase()).map(customer => (
                          <Card key={customer.id}>
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg">{customer.name}</CardTitle>
                                  <CardDescription>{customer.company}</CardDescription>
                                </div>
                                <Badge variant="outline">{customer.country}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <Button className="w-full mt-4" onClick={() => handleClaim(customer.id)}>Claim Lead</Button>
                            </CardContent>
                          </Card>
                        ))}
                      </>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="list" className="mt-0">
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {publicPool.filter(c => c.country.toLowerCase().includes(countrySearch.toLowerCase())).map(lead => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              <div className="font-medium">{lead.name}</div>
                              <div className="text-sm text-muted-foreground">{lead.company} {role === 'admin' ? ` | ${lead.phone}` : ''}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{lead.country}</Badge>
                            </TableCell>
                            <TableCell>
                               <Badge variant='secondary'>{lead.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" onClick={() => handleClaim(lead.id)}>Claim</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {publicPool.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              No leads currently in the public pool.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeTab === 'admin-users' && role === 'admin' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">System Users Management</h2>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name/Email</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appUsers.map(appUser => (
                      <TableRow key={appUser.uid}>
                        <TableCell>
                          <div className="font-medium flex items-center gap-2">
                             {appUser.displayName || 'Unnamed User'}
                             {appUser.uid === user.uid && <Badge variant="secondary" className="text-xs">You</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">{appUser.email}</div>
                        </TableCell>
                        <TableCell>
                           <Badge variant={appUser.role === 'admin' ? 'default' : appUser.role === 'manager' ? 'secondary' : 'outline'}>
                              {appUser.role}
                           </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Select 
                             disabled={appUser.uid === user.uid} 
                             value={appUser.role} 
                             onValueChange={(val) => handleChangeUserRole(appUser.uid, val)}
                          >
                            <SelectTrigger className="w-[140px] ml-auto">
                              <SelectValue placeholder="Change role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrator</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="sales">Sales Rep</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
