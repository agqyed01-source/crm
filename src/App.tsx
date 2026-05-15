import { useState, useEffect } from "react";
import Papa from "papaparse";
import { 
  Building2, 
  Users, 
  Globe2, 
  MessageCircle, 
  Mail, 
  PhoneCall,
  LogOut,
  LayoutDashboard,
  Settings,
  MoreVertical,
  Plus,
  Upload,
  FileSpreadsheet
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

// --- Types ---
type Customer = {
  id: string;
  name: string;
  company: string;
  country: string;
  phone: string;
  email: string;
  status: 'In Pool' | 'Claimed' | 'Following Up' | 'Negotiating' | 'Closed';
  salesRepId?: string;
  lastFollowUp?: string;
  daysUntilRelease?: number;
};

// --- Mock Data ---
const MOCK_CUSTOMERS: Customer[] = [
  { id: "1", name: "John Doe", company: "TechCorp", country: "USA", phone: "+1 555-0100", email: "john@techcorp.com", status: 'In Pool' },
  { id: "2", name: "Maria Garcia", company: "Global Trade", country: "Spain", phone: "+34 600 123 456", email: "maria@global.es", status: 'Claimed', salesRepId: 'me', lastFollowUp: '2 days ago', daysUntilRelease: 5 },
  { id: "3", name: "Chen Wei", company: "Asia Logistics", country: "China", phone: "+86 138 0000 0000", email: "chen@asialog.cn", status: 'In Pool' },
  { id: "4", name: "Hans Müller", company: "AutoParts GmbH", country: "Germany", phone: "+49 151 12345678", email: "hans@autoparts.de", status: 'Following Up', salesRepId: 'me', lastFollowUp: '12 hours ago', daysUntilRelease: 7 },
  { id: "5", name: "Aisha Patel", company: "Mumbai Services", country: "India", phone: "+91 98765 43210", email: "aisha@mumbaiserv.in", status: 'Claimed', salesRepId: 'other', lastFollowUp: '6 days ago' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("my-leads");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('crm-customers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load customers from local storage", e);
        return MOCK_CUSTOMERS;
      }
    }
    return MOCK_CUSTOMERS;
  });

  useEffect(() => {
    localStorage.setItem('crm-customers', JSON.stringify(customers));
  }, [customers]);
  const [dashboardImportOpen, setDashboardImportOpen] = useState(false);
  const [poolImportOpen, setPoolImportOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  
  const myLeads = customers.filter(c => c.salesRepId === 'me');
  const publicPool = customers.filter(c => c.status === 'In Pool');

  const handleImport = () => {
    if (!selectedFile) return;

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const getVal = (row: any, keywords: string[], index?: number) => {
          const key = Object.keys(row).find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
          let val = key ? row[key] : undefined;
          if (!val && index !== undefined) {
             val = Object.values(row)[index];
          }
          return typeof val === 'string' ? val.trim() : val;
        };

        const newCustomers: Customer[] = results.data.map((row: any, i) => ({
          id: `imported-${Date.now()}-${i}`,
          name: getVal(row, ['name', '收件人名'], 2) || 'Unknown',
          company: getVal(row, ['company', '买家名称'], 0) || 'Unknown Company',
          country: getVal(row, ['country', 'region', '收货国家'], 3) || 'Unknown Country',
          phone: getVal(row, ['phone', 'mobile', '手机', '联系电话'], 10) || getVal(row, [], 9) || '',
          email: getVal(row, ['email', '联系邮箱'], 8) || '',
          status: 'In Pool'
        }));
        setCustomers(prev => [...prev, ...newCustomers]);
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
  
  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-900">
      
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-neutral-200 dark:border-neutral-800">
          <Globe2 className="w-6 h-6 text-blue-600 mr-2" />
          <span className="font-bold text-lg">Global CRM</span>
        </div>
        
        <div className="p-4 flex flex-col gap-2 flex-grow">
          <Button variant="ghost" className="justify-start gap-2" onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Button>
          <Button variant={activeTab === 'my-leads' ? "secondary" : "ghost"} className="justify-start gap-2" onClick={() => setActiveTab('my-leads')}>
            <Users className="w-4 h-4" /> My Customers
            <Badge variant="secondary" className="ml-auto">{myLeads.length}</Badge>
          </Button>
          <Button variant={activeTab === 'public-pool' ? "secondary" : "ghost"} className="justify-start gap-2" onClick={() => setActiveTab('public-pool')}>
            <Building2 className="w-4 h-4" /> Public Pool
            <Badge variant="outline" className="ml-auto">{publicPool.length}</Badge>
          </Button>
          <Button variant="ghost" className="justify-start gap-2 mt-auto">
            <Settings className="w-4 h-4" /> Settings
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold capitalize">{activeTab.replace('-', ' ')}</h1>
          
          <div className="flex items-center gap-4">
            <Input placeholder="Search phone or name..." className="w-64" />
            
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <Avatar className="cursor-pointer">
                  <AvatarFallback className="bg-blue-100 text-blue-700">SR</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sales Rep (US Region)</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><LogOut className="w-4 h-4 mr-2" /> Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'dashboard' && (
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
                    <div className="grid gap-4 py-4">
                      <label className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50 relative">
                        <input 
                          type="file" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                          onChange={(e) => { 
                            if(e.target.files?.length) {
                              setSelectedFile(e.target.files[0]);
                            }
                          }} 
                        />
                        <FileSpreadsheet className={`w-10 h-10 mb-4 ${selectedFile ? 'text-blue-500' : 'text-neutral-400'}`} />
                        <p className="font-medium text-sm">
                          {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ".csv, .xlsx, .xls"}
                        </p>
                      </label>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setSelectedFile(null); setDashboardImportOpen(false); }}>Cancel</Button>
                      <Button 
                        disabled={!selectedFile}
                        onClick={handleImport}
                      >
                        Import Now
                      </Button>
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
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Claimed & Followed Up</CardTitle>
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
                <Dialog>
                  <DialogTrigger className={buttonVariants()}>
                    <Plus className="w-4 h-4 mr-2" /> Add Note
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Follow-up Note</DialogTitle>
                      <DialogDescription>
                        Record your latest interaction with a customer.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="customer">Customer</Label>
                        <Select>
                          <SelectTrigger id="customer">
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {myLeads.map(lead => (
                              <SelectItem key={lead.id} value={lead.id}>{lead.name} ({lead.company})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="note">Note Details</Label>
                        <textarea 
                          id="note" 
                          className="flex min-h-[80px] w-full border border-neutral-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-50 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300 rounded-md" 
                          placeholder="Shared a presentation about our new logistics plans on WhatsApp..."
                        ></textarea>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button onClick={() => alert('Simulated: Note saved and follow-up status updated!')}>Save Note</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Auto-Release</TableHead>
                      <TableHead className="text-right">Quick Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myLeads.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-sm text-muted-foreground">{lead.company}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.country}</Badge>
                        </TableCell>
                        <TableCell>
                           <Badge variant={lead.status === 'Following Up' ? 'default' : 'secondary'}>{lead.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                             <span className={lead.daysUntilRelease! <= 3 ? "text-red-500 font-medium" : ""}>
                               {lead.daysUntilRelease} days left
                             </span>
                          </div>
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
                                <DropdownMenuItem onClick={() => window.open(`sms:${lead.phone}`, '_blank')}>
                                  <MessageCircle className="w-4 h-4 mr-2 text-blue-500" /> SMS
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(`mailto:${lead.email}`, '_blank')}>
                                  <Mail className="w-4 h-4 mr-2 text-orange-500" /> Email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => window.open(`tel:${lead.phone}`, '_blank')}>
                                  <PhoneCall className="w-4 h-4 mr-2" /> Call
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
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
                      <div className="grid gap-4 py-4">
                        <label className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50 relative">
                          <input 
                            type="file" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                            onChange={(e) => { 
                              if(e.target.files?.length) {
                                setSelectedFile(e.target.files[0]);
                              }
                            }} 
                          />
                          <FileSpreadsheet className={`w-10 h-10 mb-4 ${selectedFile ? 'text-blue-500' : 'text-neutral-400'}`} />
                          <p className="font-medium text-sm">
                            {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ".csv, .xlsx, .xls"}
                          </p>
                        </label>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => { setSelectedFile(null); setPoolImportOpen(false); }}>Cancel</Button>
                        <Button 
                          disabled={!selectedFile}
                          onClick={handleImport}
                        >
                          Import Now
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                   </Dialog>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {!selectedCountry ? (
                  Array.from(new Set(publicPool.map(c => c.country)))
                    .filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
                    .sort((a, b) => a.localeCompare(b))
                    .map(country => {
                    const count = publicPool.filter(c => c.country === country).length;
                    return (
                      <Card key={country} className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => setSelectedCountry(country)}>
                        <CardHeader className="pb-4">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-xl flex items-center gap-2">
                              {country}
                            </CardTitle>
                            <Badge variant="default" className="text-lg px-3 py-1 bg-blue-600 hover:bg-blue-700">
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
                          <Button className="w-full mt-4" onClick={() => alert("Simulated: Claimed lead!")}>Claim Lead</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
