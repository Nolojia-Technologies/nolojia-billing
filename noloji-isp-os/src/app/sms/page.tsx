'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  MessageSquare,
  DollarSign,
  Send,
  History,
  FileText,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Trash2,
  Edit,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Check
} from 'lucide-react';

// Phone number validation regex (supports international formats)
const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return PHONE_REGEX.test(cleaned);
}

// Check if message contains Unicode characters (non-GSM)
function containsUnicode(text: string): boolean {
  const gsmChars = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑܧ¿a-zäöñüà\r\n]*$/;
  return !gsmChars.test(text);
}

// Calculate SMS segments based on content
function calculateSmsSegments(text: string): { segments: number; charsPerSegment: number; isUnicode: boolean } {
  const isUnicode = containsUnicode(text);
  const charsPerSegment = isUnicode ? 70 : 160;
  const segments = text.length === 0 ? 1 : Math.ceil(text.length / charsPerSegment);
  return { segments, charsPerSegment, isUnicode };
}
import {
  useSmsBalance,
  useSmsStats,
  useSmsLogs,
  useSmsTemplates,
  useSendSms,
  useCustomersForSms,
  usePlansForFilter,
  type CustomerFilter
} from '@/hooks/use-sms';
import { SMS_TEMPLATE_VARIABLES, previewTemplate } from '@/lib/sms-template-variables';

// Skeleton loader component
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

export default function SMSPage() {
  const { balance, loading: balanceLoading, error: balanceError, refresh: refreshBalance, addCredits } = useSmsBalance();
  const { stats, loading: statsLoading, refresh: refreshStats } = useSmsStats();
  const [logsFilter, setLogsFilter] = useState<{ status?: string; search?: string; from_date?: string; to_date?: string; limit?: number; offset?: number }>({ limit: 20, offset: 0 });
  const { logs, loading: logsLoading, refresh: refreshLogs, totalCount } = useSmsLogs(logsFilter);
  const { templates, loading: templatesLoading, refresh: refreshTemplates, createTemplate, updateTemplate, deleteTemplate } = useSmsTemplates();
  const { sendSms, sendBulkSms, sending } = useSendSms();
  const { customers, loading: customersLoading, fetchCustomers, getPhoneNumbers } = useCustomersForSms();
  const { plans } = usePlansForFilter();

  const [sendForm, setSendForm] = useState({
    recipient: '',
    message: '',
    sender_id: 'BytewaveSMS'
  });

  const [bulkForm, setBulkForm] = useState({
    recipients: '',
    message: '',
    sender_id: 'BytewaveSMS'
  });

  const [creditsForm, setCreditsForm] = useState({
    amount: '',
    cost_per_sms: '0.50'
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'notification' as const,
    content: ''
  });

  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('send'); // Track which tab is active for templates

  // Customer selection state
  const [customerFilter, setCustomerFilter] = useState<CustomerFilter | ''>('');
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>(undefined);
  const [useCustomerList, setUseCustomerList] = useState(false);

  // Load customers when filter changes and auto-apply to recipients
  const handleCustomerFilterChange = async (filter: CustomerFilter | '') => {
    setCustomerFilter(filter);
    if (filter) {
      setUseCustomerList(true);
      const result = await fetchCustomers(filter as CustomerFilter, selectedPlanId);
      // Auto-populate recipients after customers are fetched
      if (result.data && result.data.length > 0) {
        const phones = result.data.map(c => c.phone).filter(Boolean) as string[];
        setBulkForm(prev => ({ ...prev, recipients: phones.join('\n') }));
      }
    } else {
      setUseCustomerList(false);
      setBulkForm(prev => ({ ...prev, recipients: '' }));
    }
  };

  const handlePlanFilterChange = async (planId: number | undefined) => {
    setSelectedPlanId(planId);
    if (customerFilter) {
      const result = await fetchCustomers(customerFilter as CustomerFilter, planId);
      // Auto-populate recipients after customers are fetched
      if (result.data && result.data.length > 0) {
        const phones = result.data.map(c => c.phone).filter(Boolean) as string[];
        setBulkForm(prev => ({ ...prev, recipients: phones.join('\n') }));
      }
    }
  };

  // Apply selected customers to recipients
  const applyCustomersToRecipients = () => {
    const phones = getPhoneNumbers();
    setBulkForm({ ...bulkForm, recipients: phones.join('\n') });
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhoneNumber(sendForm.recipient)) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid phone number (e.g., +254712345678)',
        variant: 'destructive'
      });
      return;
    }

    const { error } = await sendSms(
      sendForm.recipient,
      sendForm.message,
      sendForm.sender_id
    );

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'SMS sent successfully'
      });
      setSendForm({ recipient: '', message: '', sender_id: 'BytewaveSMS' });
      refreshBalance();
      refreshStats();
      refreshLogs();
    }
  };

  const parsedBulkRecipients = useMemo(() => {
    const all = bulkForm.recipients
      .split(/[,\n]/)
      .map(r => r.trim())
      .filter(r => r.length > 0);
    const valid = all.filter(r => validatePhoneNumber(r));
    const invalid = all.filter(r => !validatePhoneNumber(r));
    return { all, valid, invalid };
  }, [bulkForm.recipients]);

  const handleBulkSMSSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedBulkRecipients.all.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter at least one recipient',
        variant: 'destructive'
      });
      return;
    }

    if (parsedBulkRecipients.invalid.length > 0) {
      toast({
        title: 'Invalid Phone Numbers',
        description: `${parsedBulkRecipients.invalid.length} invalid number(s) found. Please fix them before sending.`,
        variant: 'destructive'
      });
      return;
    }

    // Show confirmation dialog
    setBulkConfirm(true);
  };

  const handleSendBulkSMS = async () => {
    setBulkConfirm(false);

    const { data, error } = await sendBulkSms(parsedBulkRecipients.valid, bulkForm.message, bulkForm.sender_id);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Bulk SMS Sent',
        description: `Sent: ${data?.sent || 0}, Failed: ${data?.failed || 0}`
      });
      setBulkForm({ recipients: '', message: '', sender_id: 'BytewaveSMS' });
      refreshBalance();
      refreshStats();
      refreshLogs();
    }
  };

  const handleAddCredits = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await addCredits(
      parseInt(creditsForm.amount),
      parseFloat(creditsForm.cost_per_sms)
    );

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: `Added ${creditsForm.amount} SMS credits`
      });
      setCreditsForm({ amount: '', cost_per_sms: '0.50' });
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await createTemplate({
      name: newTemplate.name,
      category: newTemplate.category,
      content: newTemplate.content,
      is_active: true
    });

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Template created successfully'
      });
      setNewTemplate({ name: '', category: 'notification', content: '' });
      setShowCreateTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    const { error } = await deleteTemplate(id);
    setDeleteConfirm(null);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Template deleted'
      });
    }
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    const { error } = await updateTemplate(editingTemplate.id, {
      name: editingTemplate.name,
      category: editingTemplate.category,
      content: editingTemplate.content
    });

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Template updated successfully'
      });
      setEditingTemplate(null);
    }
  };

  const useTemplate = (template: any) => {
    // Apply to the appropriate form based on active tab
    if (activeTab === 'bulk') {
      setBulkForm({ ...bulkForm, message: template.content });
    } else {
      setSendForm({ ...sendForm, message: template.content });
    }
    toast({
      title: 'Template Applied',
      description: `Using template: ${template.name}`
    });
  };

  const smsInfo = calculateSmsSegments(sendForm.message);
  const charCount = sendForm.message.length;
  const creditsNeeded = smsInfo.segments;

  const bulkSmsInfo = calculateSmsSegments(bulkForm.message);
  const bulkCharCount = bulkForm.message.length;
  const bulkRecipientCount = parsedBulkRecipients.valid.length;
  const bulkCreditsNeeded = bulkSmsInfo.segments * bulkRecipientCount;

  // Pagination helpers
  const currentPage = Math.floor((logsFilter.offset || 0) / (logsFilter.limit || 20)) + 1;
  const totalPages = Math.ceil(totalCount / (logsFilter.limit || 20));

  const goToPage = (page: number) => {
    const newOffset = (page - 1) * (logsFilter.limit || 20);
    setLogsFilter({ ...logsFilter, offset: newOffset });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">SMS Management</h1>
        <p className="text-muted-foreground">Manage SMS credits and send messages to customers</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Available</span>
          </div>
          {balanceLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : balanceError ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Error</span>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">{balance?.balance?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">SMS Credits</p>
            </>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Sent</span>
          </div>
          {statsLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold">{(stats?.sent || 0) + (stats?.delivered || 0)}</div>
              <p className="text-xs text-muted-foreground">Total SMS</p>
            </>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Cost</span>
          </div>
          {balanceLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {balance?.currency} {balance?.cost_per_sms ? parseFloat(String(balance.cost_per_sms)).toFixed(2) : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">Per SMS</p>
            </>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <History className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Used</span>
          </div>
          {statsLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold">{stats?.total_credits_used || 0}</div>
              <p className="text-xs text-muted-foreground">Credits Used</p>
            </>
          )}
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">Send SMS</TabsTrigger>
          <TabsTrigger value="bulk">Bulk SMS</TabsTrigger>
          <TabsTrigger value="credits">Manage Credits</TabsTrigger>
          <TabsTrigger value="logs">SMS Logs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Send SMS Tab */}
        <TabsContent value="send" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Send SMS</h3>
              <form onSubmit={handleSendSMS} className="space-y-4">
                <div>
                  <Label htmlFor="recipient">Recipient Phone Number *</Label>
                  <Input
                    id="recipient"
                    value={sendForm.recipient}
                    onChange={(e) => setSendForm({ ...sendForm, recipient: e.target.value })}
                    placeholder="+254712345678"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="sender_id">Sender ID</Label>
                  <Input
                    id="sender_id"
                    value={sendForm.sender_id}
                    onChange={(e) => setSendForm({ ...sendForm, sender_id: e.target.value })}
                    placeholder="BytewaveSMS"
                    maxLength={11}
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <textarea
                    id="message"
                    className="w-full min-h-[120px] p-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={sendForm.message}
                    onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                    placeholder="Type your message here..."
                    required
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>
                      {charCount} / {smsInfo.charsPerSegment} characters
                      {smsInfo.isUnicode && <span className="text-yellow-600 ml-1">(Unicode)</span>}
                    </span>
                    <span>{creditsNeeded} credit{creditsNeeded > 1 ? 's' : ''} needed</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={sending || !balance || balance.balance < creditsNeeded}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send SMS
                </Button>
              </form>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Templates</h3>
              {templatesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates available</p>
              ) : (
                <div className="space-y-2">
                  {templates.slice(0, 5).map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => useTemplate(template)}
                    >
                      <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-medium text-sm">{template.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {template.content.substring(0, 50)}...
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Bulk SMS Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <Card className="p-6 max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Send Bulk SMS</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Send the same message to multiple recipients at once
            </p>

            {/* Customer Selection Section */}
            <div className="bg-muted/50 p-4 rounded-lg mb-4">
              <Label className="text-sm font-medium mb-3 block">Select Recipients by Category</Label>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label htmlFor="customer_filter" className="text-xs text-muted-foreground">Customer Status</Label>
                  <select
                    id="customer_filter"
                    className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={customerFilter}
                    onChange={(e) => handleCustomerFilterChange(e.target.value as CustomerFilter | '')}
                  >
                    <option value="">-- Manual Entry --</option>
                    <option value="all">All Active Customers</option>
                    <option value="online">Online Customers</option>
                    <option value="offline">Offline Customers</option>
                    <option value="expiring_soon">Expiring Soon (3 days)</option>
                    <option value="expired">Expired Subscriptions</option>
                    <option value="inactive">Inactive Customers</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="plan_filter" className="text-xs text-muted-foreground">Filter by Plan</Label>
                  <select
                    id="plan_filter"
                    className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={selectedPlanId || ''}
                    onChange={(e) => handlePlanFilterChange(e.target.value ? Number(e.target.value) : undefined)}
                    disabled={!customerFilter}
                  >
                    <option value="">All Plans</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>{plan.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={applyCustomersToRecipients}
                    disabled={!customerFilter || customersLoading || customers.length === 0}
                    className="w-full"
                  >
                    {customersLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="w-4 h-4 mr-2" />
                    )}
                    {customersLoading ? 'Loading...' : `Apply ${customers.length} Customers`}
                  </Button>
                </div>
              </div>

              {/* Customer Preview */}
              {useCustomerList && customers.length > 0 && (
                <div className="mt-3 p-3 bg-background rounded border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Selected Customers ({customers.length})</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomerFilter('');
                        setUseCustomerList(false);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                    {customers.slice(0, 10).map((c) => (
                      <div key={c.id} className="flex justify-between text-muted-foreground">
                        <span>{c.full_name || c.username}</span>
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${c.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {c.phone}
                        </span>
                      </div>
                    ))}
                    {customers.length > 10 && (
                      <div className="text-muted-foreground italic">
                        ... and {customers.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {useCustomerList && customers.length === 0 && !customersLoading && (
                <p className="mt-3 text-sm text-muted-foreground">No customers found matching the selected criteria.</p>
              )}
            </div>

            <form onSubmit={handleBulkSMSSubmit} className="space-y-4">
              <div>
                <Label htmlFor="bulk_recipients">Recipients *</Label>
                <textarea
                  id="bulk_recipients"
                  className="w-full min-h-[100px] p-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={bulkForm.recipients}
                  onChange={(e) => {
                    setBulkForm({ ...bulkForm, recipients: e.target.value });
                    // Clear customer selection if user manually edits
                    if (useCustomerList) {
                      setUseCustomerList(false);
                      setCustomerFilter('');
                    }
                  }}
                  placeholder="Enter phone numbers separated by commas or new lines:
+254712345678
+254722345678
+254732345678"
                />
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-muted-foreground">
                    {parsedBulkRecipients.valid.length} valid recipient{parsedBulkRecipients.valid.length !== 1 ? 's' : ''}
                  </span>
                  {parsedBulkRecipients.invalid.length > 0 && (
                    <span className="text-destructive">
                      {parsedBulkRecipients.invalid.length} invalid number{parsedBulkRecipients.invalid.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="bulk_sender_id">Sender ID</Label>
                <Input
                  id="bulk_sender_id"
                  value={bulkForm.sender_id}
                  onChange={(e) => setBulkForm({ ...bulkForm, sender_id: e.target.value })}
                  placeholder="BytewaveSMS"
                  maxLength={11}
                />
              </div>

              <div>
                <Label htmlFor="bulk_message">Message *</Label>
                <textarea
                  id="bulk_message"
                  className="w-full min-h-[120px] p-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={bulkForm.message}
                  onChange={(e) => setBulkForm({ ...bulkForm, message: e.target.value })}
                  placeholder="Type your message here..."
                  required
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>
                    {bulkCharCount} / {bulkSmsInfo.charsPerSegment} characters
                    {bulkSmsInfo.isUnicode && <span className="text-yellow-600 ml-1">(Unicode)</span>}
                  </span>
                  <span>{bulkCreditsNeeded} credit{bulkCreditsNeeded > 1 ? 's' : ''} needed total</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={sending || !balance || balance.balance < bulkCreditsNeeded || parsedBulkRecipients.valid.length === 0}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send to {parsedBulkRecipients.valid.length} Recipient{parsedBulkRecipients.valid.length !== 1 ? 's' : ''}
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits">
          <Card className="p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add SMS Credits</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Purchase SMS credits in bulk from your provider and add them here
            </p>

            <form onSubmit={handleAddCredits} className="space-y-4">
              <div>
                <Label htmlFor="amount">Number of Credits *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={creditsForm.amount}
                  onChange={(e) => setCreditsForm({ ...creditsForm, amount: e.target.value })}
                  placeholder="1000"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cost_per_sms">Cost per SMS (KES)</Label>
                <Input
                  id="cost_per_sms"
                  type="number"
                  step="0.01"
                  value={creditsForm.cost_per_sms}
                  onChange={(e) => setCreditsForm({ ...creditsForm, cost_per_sms: e.target.value })}
                  placeholder="0.50"
                />
              </div>

              <Button type="submit" disabled={!creditsForm.amount}>
                <Plus className="w-4 h-4 mr-2" />
                Add Credits
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">SMS Logs</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  placeholder="Search..."
                  value={logsFilter.search || ''}
                  onChange={(e) => setLogsFilter({ ...logsFilter, search: e.target.value, offset: 0 })}
                  className="w-40"
                />
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={logsFilter.from_date || ''}
                    onChange={(e) => setLogsFilter({ ...logsFilter, from_date: e.target.value || undefined, offset: 0 })}
                    className="w-36"
                    placeholder="From"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="date"
                    value={logsFilter.to_date || ''}
                    onChange={(e) => setLogsFilter({ ...logsFilter, to_date: e.target.value || undefined, offset: 0 })}
                    className="w-36"
                    placeholder="To"
                  />
                </div>
                <select
                  className="border border-input rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={logsFilter.status || ''}
                  onChange={(e) => setLogsFilter({ ...logsFilter, status: e.target.value || undefined, offset: 0 })}
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                </select>
                {(logsFilter.search || logsFilter.from_date || logsFilter.to_date || logsFilter.status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogsFilter({ limit: 20, offset: 0 })}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={refreshLogs}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No SMS logs found</p>
            ) : (
              <>
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="border-b pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{log.recipient}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">{log.message}</div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-xs px-2 py-1 rounded ${log.status === 'sent' || log.status === 'delivered'
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                              }`}
                          >
                            {log.status?.toUpperCase()}
                          </span>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((logsFilter.offset || 0) + 1)}-{Math.min((logsFilter.offset || 0) + logs.length, totalCount)} of {totalCount} logs
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">SMS Templates</h3>
              <Button onClick={() => setShowCreateTemplate(!showCreateTemplate)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>

            {showCreateTemplate && (
              <Card className="p-4 mb-4 border-dashed">
                <form onSubmit={handleCreateTemplate} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="template_name">Template Name *</Label>
                      <Input
                        id="template_name"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="e.g., Payment Reminder"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="template_category">Category *</Label>
                      <select
                        id="template_category"
                        className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        value={newTemplate.category}
                        onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as any })}
                      >
                        <option value="billing">Billing</option>
                        <option value="notification">Notification</option>
                        <option value="marketing">Marketing</option>
                        <option value="support">Support</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="template_content">Content *</Label>
                    <textarea
                      id="template_content"
                      className="w-full min-h-[100px] p-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                      placeholder="Hi {{customer_name}}, your subscription for {{plan_name}} expires on {{expiry_date}}. Please renew to continue enjoying our services."
                      required
                    />

                    {/* Available Variables Section */}
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Click to insert variable:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {SMS_TEMPLATE_VARIABLES.map((variable) => (
                          <button
                            key={variable.key}
                            type="button"
                            className="px-2 py-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded border border-primary/20 transition-colors"
                            title={`${variable.description} (e.g., ${variable.example})`}
                            onClick={() => {
                              const textarea = document.getElementById('template_content') as HTMLTextAreaElement;
                              const cursorPos = textarea?.selectionStart || newTemplate.content.length;
                              const textBefore = newTemplate.content.substring(0, cursorPos);
                              const textAfter = newTemplate.content.substring(cursorPos);
                              const newContent = `${textBefore}{{${variable.key}}}${textAfter}`;
                              setNewTemplate({ ...newTemplate, content: newContent });
                            }}
                          >
                            {`{{${variable.key}}}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Template Preview */}
                    {newTemplate.content && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Preview (with sample data):</p>
                        <p className="text-sm text-blue-900 dark:text-blue-200 whitespace-pre-wrap">
                          {previewTemplate(newTemplate.content)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">Create Template</Button>
                    <Button type="button" variant="outline" onClick={() => setShowCreateTemplate(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Edit Template Modal */}
            {editingTemplate && (
              <Card className="p-4 mb-4 border-2 border-primary">
                <h4 className="font-semibold mb-4">Edit Template</h4>
                <form onSubmit={handleUpdateTemplate} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="edit_template_name">Template Name *</Label>
                      <Input
                        id="edit_template_name"
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_template_category">Category *</Label>
                      <select
                        id="edit_template_category"
                        className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        value={editingTemplate.category}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                      >
                        <option value="billing">Billing</option>
                        <option value="notification">Notification</option>
                        <option value="marketing">Marketing</option>
                        <option value="support">Support</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit_template_content">Content *</Label>
                    <textarea
                      id="edit_template_content"
                      className="w-full min-h-[100px] p-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      value={editingTemplate.content}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                      required
                    />

                    {/* Available Variables Section */}
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Click to insert variable:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {SMS_TEMPLATE_VARIABLES.map((variable) => (
                          <button
                            key={variable.key}
                            type="button"
                            className="px-2 py-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded border border-primary/20 transition-colors"
                            title={`${variable.description} (e.g., ${variable.example})`}
                            onClick={() => {
                              const textarea = document.getElementById('edit_template_content') as HTMLTextAreaElement;
                              const cursorPos = textarea?.selectionStart || editingTemplate.content.length;
                              const textBefore = editingTemplate.content.substring(0, cursorPos);
                              const textAfter = editingTemplate.content.substring(cursorPos);
                              const newContent = `${textBefore}{{${variable.key}}}${textAfter}`;
                              setEditingTemplate({ ...editingTemplate, content: newContent });
                            }}
                          >
                            {`{{${variable.key}}}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Template Preview */}
                    {editingTemplate.content && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Preview (with sample data):</p>
                        <p className="text-sm text-blue-900 dark:text-blue-200 whitespace-pre-wrap">
                          {previewTemplate(editingTemplate.content)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">
                      <Check className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditingTemplate(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {templatesLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No templates found. Create your first template!</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {templates.map((template) => (
                  <Card key={template.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{template.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {template.category}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTemplate({ ...template })}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {deleteConfirm === template.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(template.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="text-sm bg-muted p-2 rounded">{template.content}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => useTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk SMS Confirmation Dialog */}
      {bulkConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Confirm Bulk SMS</h3>
            <p className="text-muted-foreground mb-4">
              You are about to send SMS to <strong>{parsedBulkRecipients.valid.length}</strong> recipients.
            </p>
            <div className="bg-muted p-3 rounded mb-4">
              <p className="text-sm font-medium mb-1">Message Preview:</p>
              <p className="text-sm line-clamp-3">{bulkForm.message}</p>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <span>Credits needed:</span>
              <span className="font-semibold">{bulkCreditsNeeded}</span>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <span>Estimated cost:</span>
              <span className="font-semibold">
                {balance?.currency} {((balance?.cost_per_sms || 0) * bulkCreditsNeeded).toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBulkConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendBulkSMS} disabled={sending}>
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Confirm & Send
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
