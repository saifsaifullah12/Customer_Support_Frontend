'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Loader2, Shield, MessageSquare, Plus, Trash2, 
  AlertCircle, BarChart3, CheckCircle, XCircle, TrendingUp, Mail, BookOpen, 
  RefreshCw, Users, Download, Copy, Info, Clock, ExternalLink, ChevronRight, 
  Filter } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
  issueType?: string;
}

interface BannedWord {
  id: number;
  phrase: string;
  created_at: string;
}

interface EvalLog {
  id: string;
  user_input: string;
  agent_output: string;
  passed: boolean;
  score: number;
  feedback: string;
  created_at: string;
}

interface EmailHistory {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: Date;
  status: 'sent' | 'failed';
  response?: any;
}

interface EmailTemplate {
  name: string;
  subject: string;
  body: string;
  placeholders: string[];
}

interface EmailConfig {
  hasPublicKey: boolean;
  hasSecretKey: boolean;
  hasCredentialId: boolean;
  nodeEnv: string;
  serverTime: string;
}

const API_URL = 'https://customer-support-backend-nspr.onrender.com';

export default function ChatInterface() {
  const [activeTab, setActiveTab] = useState<'chat' | 'guardrails' | 'evals' | 'email'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  
  // Guardrail states
  const [bannedWords, setBannedWords] = useState<BannedWord[]>([]);
  const [newPhrase, setNewPhrase] = useState('');
  const [isAddingPhrase, setIsAddingPhrase] = useState(false);
  const [guardrailError, setGuardrailError] = useState<string | null>(null);
  
  // Evaluation states
  const [evalLogs, setEvalLogs] = useState<EvalLog[]>([]);
  const [isLoadingEvals, setIsLoadingEvals] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [selectedEval, setSelectedEval] = useState<EvalLog | null>(null);
  
  // Email states
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<Record<string, EmailTemplate>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [showTemplatePlaceholders, setShowTemplatePlaceholders] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [bulkEmails, setBulkEmails] = useState<string>('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check backend connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_URL}/health`, {
          method: 'GET',
        });
        setIsConnected(response.ok);
      } catch (error) {
        setIsConnected(false);
      }
    };
    checkConnection();
  }, []);

  // Load banned words when guardrails tab is active
  useEffect(() => {
    if (activeTab === 'guardrails') {
      loadBannedWords();
    }
  }, [activeTab]);

  // Load eval logs when evals tab is active
  useEffect(() => {
    if (activeTab === 'evals') {
      loadEvalLogs();
    }
  }, [activeTab]);

  // Load email config and templates when email tab is active
  useEffect(() => {
    if (activeTab === 'email') {
      loadEmailConfig();
      loadEmailTemplates();
    }
  }, [activeTab]);

  const loadBannedWords = async () => {
    try {
      const response = await fetch(`${API_URL}/guardrails/banned-words`);
      if (response.ok) {
        const data = await response.json();
        setBannedWords(data.words || []);
      }
    } catch (error) {
      console.error('Failed to load banned words:', error);
      setGuardrailError('Failed to load banned words');
    }
  };

  const loadEvalLogs = async () => {
    setIsLoadingEvals(true);
    setEvalError(null);
    try {
      const response = await fetch(`${API_URL}/evals/logs`);
      if (response.ok) {
        const data = await response.json();
        setEvalLogs(data.logs || []);
      } else {
        setEvalError('Failed to load evaluation logs');
      }
    } catch (error) {
      console.error('Failed to load eval logs:', error);
      setEvalError('Failed to load evaluation logs');
    } finally {
      setIsLoadingEvals(false);
    }
  };

  const loadEmailConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/email/config`);
      if (response.ok) {
        const data = await response.json();
        setEmailConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to load email config:', error);
    }
  };

  const loadEmailTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await fetch(`${API_URL}/email/templates`);
      if (response.ok) {
        const data = await response.json();
        setEmailTemplates(data.templates || {});
      }
    } catch (error) {
      console.error('Failed to load email templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const addBannedWord = async () => {
    if (!newPhrase.trim()) return;
    
    setIsAddingPhrase(true);
    setGuardrailError(null);
    
    try {
      const response = await fetch(`${API_URL}/guardrails/banned-words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: newPhrase.trim() }),
      });
      
      if (response.ok) {
        setNewPhrase('');
        await loadBannedWords();
      } else {
        const error = await response.json();
        setGuardrailError(error.error || 'Failed to add phrase');
      }
    } catch (error) {
      console.error('Failed to add banned word:', error);
      setGuardrailError('Failed to add phrase');
    } finally {
      setIsAddingPhrase(false);
    }
  };

  const deleteBannedWord = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/guardrails/banned-words/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadBannedWords();
      }
    } catch (error) {
      console.error('Failed to delete banned word:', error);
    }
  };

  const deleteEvalLog = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/evals/logs/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadEvalLogs();
        if (selectedEval?.id === id) {
          setSelectedEval(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete eval log:', error);
    }
  };

  const applyTemplate = (templateName: string, template: EmailTemplate) => {
    let subject = template.subject;
    let body = template.body;
    
    // Apply any existing variables
    Object.keys(templateVariables).forEach(key => {
      const value = templateVariables[key];
      subject = subject.replace(`{${key}}`, value);
      body = body.replace(`{${key}}`, value);
    });
    
    setEmailSubject(subject);
    setEmailBody(body);
    setSelectedTemplate(templateName);
    setShowTemplatePlaceholders(true);
    
    // Initialize variables for this template
    const newVariables: Record<string, string> = {};
    template.placeholders.forEach(placeholder => {
      if (!templateVariables[placeholder]) {
        newVariables[placeholder] = '';
      }
    });
    setTemplateVariables(prev => ({ ...prev, ...newVariables }));
  };

  const updateTemplateVariable = (key: string, value: string) => {
    setTemplateVariables(prev => ({ ...prev, [key]: value }));
    
    // Update subject and body with new variable
    const template = emailTemplates[selectedTemplate];
    if (template) {
      let newSubject = template.subject;
      let newBody = template.body;
      
      Object.keys(templateVariables).forEach(k => {
        const val = k === key ? value : templateVariables[k];
        newSubject = newSubject.replace(`{${k}}`, val || '');
        newBody = newBody.replace(`{${k}}`, val || '');
      });
      
      setEmailSubject(newSubject);
      setEmailBody(newBody);
    }
  };

  const clearTemplate = () => {
    setSelectedTemplate('');
    setShowTemplatePlaceholders(false);
    setTemplateVariables({});
  };

  const sendEmail = async () => {
    let recipients = [emailTo.trim()];
    
    // Handle bulk emails
    if (showBulkInput && bulkEmails.trim()) {
      recipients = bulkEmails
        .split(/[\n,;]/)
        .map(email => email.trim())
        .filter(email => email.length > 0);
      
      if (recipients.length === 0) {
        setEmailError('Please enter at least one valid email address');
        return;
      }
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      setEmailError(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    if (!emailSubject.trim() || !emailBody.trim()) {
      setEmailError('Subject and body are required');
      return;
    }

    setIsSendingEmail(true);
    setEmailError(null);
    setEmailSuccess(null);

    try {
      const payload: any = {
        to: recipients[0],
        subject: emailSubject.trim(),
        body: emailBody.trim(),
      };

      // If multiple recipients, use bulk endpoint
      if (recipients.length > 1) {
        payload.emails = recipients;
      }

      const endpoint = recipients.length > 1 ? '/email/bulk' : '/send-email';
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        const successMessage = recipients.length > 1 
          ? `Email sent to ${recipients.length} recipients!`
          : 'Email sent successfully!';
        
        setEmailSuccess(successMessage);
        
        // Add to history
        const newEmail: EmailHistory = {
          id: Date.now().toString(),
          to: recipients.length > 1 ? `${recipients[0]} (+${recipients.length - 1} more)` : recipients[0],
          subject: emailSubject.trim(),
          body: emailBody.trim(),
          sentAt: new Date(),
          status: 'sent',
          response: data
        };
        
        setEmailHistory(prev => [newEmail, ...prev.slice(0, 9)]); // Keep last 10
        
        // Clear form if single email
        if (recipients.length === 1) {
          setEmailTo('');
          setEmailSubject('');
          setEmailBody('');
          clearTemplate();
        }
        
        setTimeout(() => setEmailSuccess(null), 5000);
      } else {
        setEmailError(data.error || 'Failed to send email');
        
        // Add failed attempt to history
        const failedEmail: EmailHistory = {
          id: Date.now().toString(),
          to: recipients.length > 1 ? `${recipients.length} recipients` : recipients[0],
          subject: emailSubject.trim(),
          body: emailBody.trim(),
          sentAt: new Date(),
          status: 'failed',
          response: data
        };
        
        setEmailHistory(prev => [failedEmail, ...prev.slice(0, 9)]);
      }
    } catch (error: any) {
      console.error('Failed to send email:', error);
      setEmailError('Failed to send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const testEmailConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/email/config`);
      if (response.ok) {
        const data = await response.json();
        alert(`✅ Email service connected!\n\nConfiguration:\n• Public Key: ${data.config.hasPublicKey ? '✓' : '✗'}\n• Secret Key: ${data.config.hasSecretKey ? '✓' : '✗'}\n• Credential ID: ${data.config.hasCredentialId ? '✓' : '✗'}`);
      }
    } catch (error) {
      alert('❌ Failed to connect to email service');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const exportEmailHistory = () => {
    const csvContent = [
      ['ID', 'To', 'Subject', 'Status', 'Sent At'].join(','),
      ...emailHistory.map(email => [
        email.id,
        `"${email.to}"`,
        `"${email.subject}"`,
        email.status,
        email.sentAt.toISOString()
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.ok && data.imageBase64) {
        return data.imageBase64;
      }
      return null;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;

    const currentText = inputText;
    const currentImage = selectedImage;
    const currentImagePreview = imagePreview;

    setInputText('');
    removeImage();
    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentText,
      imageUrl: currentImagePreview || undefined,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      let imageBase64: string | null = null;

      if (currentImage) {
        try {
          imageBase64 = await uploadImage(currentImage);
        } catch (uploadError) {
          console.error('Failed to upload image:', uploadError);
        }
      }

      const payload: any = {};
      
      if (currentText.trim()) {
        payload.text = currentText;
      }

      if (imageBase64) {
        payload.imageBase64 = imageBase64;
      }

      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status: ${response.status}`);
      }

      const data = await response.json();

      if (data.ok && data.text) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.text,
          timestamp: new Date(),
          issueType: data.issueType,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsConnected(true);
      } else {
        throw new Error(data.error || 'No response from assistant');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsConnected(false);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I couldn't connect to the server. Please ensure the backend is running on ${API_URL}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const evalStats = {
    total: evalLogs.length,
    passed: evalLogs.filter(log => log.passed).length,
    failed: evalLogs.filter(log => !log.passed).length,
    avgScore: evalLogs.length > 0
      ? (evalLogs.reduce((sum, log) => {
          const score = typeof log.score === "string" ? parseFloat(log.score) : log.score;
          return sum + (isNaN(score) ? 0 : score);
        }, 0) / evalLogs.length).toFixed(2)
      : "0.00",
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Left Sidebar */}
      <div className="w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-200/60 bg-gradient-to-br from-slate-900 to-blue-900">
          <h2 className="text-xl font-bold text-white tracking-tight">Control Center</h2>
          <p className="text-xs text-blue-200 mt-1 font-medium">System Administration</p>
        </div>
        
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium text-sm ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                : 'text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Chat Interface</span>
          </button>
          
          <button
            onClick={() => setActiveTab('guardrails')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium text-sm ${
              activeTab === 'guardrails'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                : 'text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span>Guardrails</span>
          </button>

          <button
            onClick={() => setActiveTab('evals')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium text-sm ${
              activeTab === 'evals'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                : 'text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Evaluations</span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium text-sm ${
              activeTab === 'email'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                : 'text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <Mail className="w-5 h-5" />
            <span>Send Email</span>
            {emailHistory.length > 0 && (
              <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {emailHistory.length}
              </span>
            )}
          </button>
        </nav>
        
        {isConnected !== null && (
          <div className="p-4 border-t border-slate-200/60 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                {isConnected && (
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
                )}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-700">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                <p className="text-xs text-slate-500">Backend Status</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'chat' && (
          <>
            <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-8 py-5 shadow-sm">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
                Support Chat
              </h1>
              <p className="text-sm text-slate-600 mt-1.5 font-medium">
                Get help with billing and technical issues
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 mt-20 px-4">
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-xl">
                      <MessageSquare className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-xl font-bold text-slate-800 mb-3">
                      Welcome to Support Chat!
                    </p>
                    <p className="text-sm text-slate-600 mb-4">
                      Ask me about billing issues, technical problems, or upload screenshots.
                    </p>
                  </div>
                  {isConnected === false && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-md mx-auto mt-6">
                      <p className="text-sm text-red-800">
                        ⚠️ Cannot connect to backend server at <strong>{API_URL}</strong>
                        <br />
                        Please make sure your backend is running.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-500/20'
                        : 'bg-white text-slate-900 border border-slate-200/60'
                    }`}
                  >
                    {message.imageUrl && (
                      <img
                        src={message.imageUrl}
                        alt="Uploaded"
                        className="rounded-xl mb-3 max-w-full h-auto shadow-sm"
                      />
                    )}
                    <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">
                      {message.content}
                    </p>
                    {message.issueType && message.role === 'assistant' && (
                      <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                        <span className="font-semibold">Issue Type:</span>{' '}
                        <span className="capitalize font-medium">{message.issueType}</span>
                      </div>
                    )}
                    <p
                      className={`text-xs mt-2 font-medium ${
                        message.role === 'user'
                          ? 'text-blue-100'
                          : 'text-slate-500'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 shadow-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 px-6 py-5 shadow-lg">
              {imagePreview && (
                <div className="mb-4 relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-24 w-24 object-cover rounded-xl border-2 border-blue-500 shadow-lg"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex-shrink-0 p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Paperclip className="w-5 h-5 text-slate-700" />
                </button>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1 resize-none border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />

                <button
                  onClick={sendMessage}
                  disabled={isLoading || (!inputText.trim() && !selectedImage)}
                  className="flex-shrink-0 p-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-3 px-1 font-medium">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </>
        )}

        {activeTab === 'guardrails' && (
          <>
            <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-8 py-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
                    Guardrails Management
                  </h1>
                  <p className="text-sm text-slate-600 mt-1 font-medium">
                    Manage banned words and phrases for input filtering
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 mb-6 shadow-lg">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Add Banned Phrase</h2>
                
                {guardrailError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 font-medium">{guardrailError}</p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newPhrase}
                    onChange={(e) => setNewPhrase(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addBannedWord()}
                    placeholder="Enter word or phrase to ban..."
                    disabled={isAddingPhrase}
                    className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 font-medium"
                  />
                  <button
                    onClick={addBannedWord}
                    disabled={isAddingPhrase || !newPhrase.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-blue-500/30"
                  >
                    {isAddingPhrase ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                    Add
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50">
                  <h2 className="text-xl font-bold text-slate-900">
                    Banned Phrases ({bannedWords.length})
                  </h2>
                </div>
                
                <div className="divide-y divide-slate-200/60">
                  {bannedWords.length === 0 ? (
                    <div className="px-6 py-16 text-center text-slate-500">
                      <Shield className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                      <p className="text-base font-semibold text-slate-700">No banned phrases yet</p>
                      <p className="text-sm mt-2">Add phrases above to start filtering</p>
                    </div>
                  ) : (
                    bannedWords.map((word) => (
                      <div
                        key={word.id}
                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-slate-900 font-semibold text-[15px]">{word.phrase}</p>
                          <p className="text-xs text-slate-500 mt-1.5 font-medium">
                            Added {new Date(word.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteBannedWord(word.id)}
                          className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'evals' && (
          <>
            <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-8 py-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
                    Response Evaluations
                  </h1>
                  <p className="text-sm text-slate-600 mt-1 font-medium">
                    Monitor and analyze agent response quality
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              {evalError && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 font-medium">{evalError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">Total</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{evalStats.total}</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">Passed</p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-600">{evalStats.passed}</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">Failed</p>
                  </div>
                  <p className="text-3xl font-bold text-red-600">{evalStats.failed}</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">Avg Score</p>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">{evalStats.avgScore}</p>
                </div>
              </div>

              {isLoadingEvals ? (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg p-16 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50">
                      <h2 className="text-xl font-bold text-slate-900">
                        Evaluation Logs ({evalLogs.length})
                      </h2>
                    </div>
                    
                    <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-200/60">
                      {evalLogs.length === 0 ? (
                        <div className="px-6 py-16 text-center text-slate-500">
                          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                          <p className="text-base font-semibold text-slate-700">No evaluations yet</p>
                          <p className="text-sm mt-2">Start chatting to generate evaluation data</p>
                        </div>
                      ) : (
                        evalLogs.map((log) => (
                          <div
                            key={log.id}
                            onClick={() => setSelectedEval(log)}
                            className={`px-6 py-4 cursor-pointer transition-colors ${
                              selectedEval?.id === log.id
                                ? 'bg-blue-50 border-l-4 border-blue-600'
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                {log.passed ? (
                                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                )}
                                <span className={`text-sm font-bold ${
                                  log.passed ? 'text-emerald-600' : 'text-red-600'
                                }`}>
                                  Score: {log.score.toFixed(2)}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteEvalLog(log.id);
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <p className="text-sm text-slate-700 font-medium line-clamp-2 mb-2">
                              {log.user_input}
                            </p>
                            
                            {log.feedback && (
                              <p className="text-xs text-slate-500 italic mb-2">
                                {log.feedback}
                              </p>
                            )}
                            
                            <p className="text-xs text-slate-400 font-medium">
                              {new Date(log.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50">
                      <h2 className="text-xl font-bold text-slate-900">Evaluation Detail</h2>
                    </div>
                    
                    <div className="p-6 max-h-[600px] overflow-y-auto">
                      {selectedEval ? (
                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            {selectedEval.passed ? (
                              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl font-semibold">
                                <CheckCircle className="w-5 h-5" />
                                <span>Passed</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-semibold">
                                <XCircle className="w-5 h-5" />
                                <span>Failed</span>
                              </div>
                            )}
                            <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-bold">
                              Score: {selectedEval.score.toFixed(2)}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-bold text-slate-700 mb-2 block">
                              User Input
                            </label>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                              <p className="text-sm text-slate-900 whitespace-pre-wrap">
                                {selectedEval.user_input}
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-bold text-slate-700 mb-2 block">
                              Agent Output
                            </label>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                              <p className="text-sm text-slate-900 whitespace-pre-wrap">
                                {selectedEval.agent_output}
                              </p>
                            </div>
                          </div>

                          {selectedEval.feedback && (
                            <div>
                              <label className="text-sm font-bold text-slate-700 mb-2 block">
                                Feedback
                              </label>
                              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                <p className="text-sm text-blue-900 italic">
                                  {selectedEval.feedback}
                                </p>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="text-sm font-bold text-slate-700 mb-2 block">
                              Timestamp
                            </label>
                            <p className="text-sm text-slate-600 font-medium">
                              {new Date(selectedEval.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-16 text-slate-500">
                          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                          <p className="text-base font-semibold text-slate-700">
                            No evaluation selected
                          </p>
                          <p className="text-sm mt-2">
                            Click on a log to view details
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'email' && (
          <>
            <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-8 py-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
                    Send Email
                  </h1>
                  <p className="text-sm text-slate-600 mt-1 font-medium">
                    Compose and send emails to stakeholders
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Email Form */}
                <div className="lg:col-span-2 space-y-6">
                  {emailSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-emerald-800 font-medium">{emailSuccess}</p>
                        <button
                          onClick={() => setEmailSuccess(null)}
                          className="text-xs text-emerald-700 hover:text-emerald-800 mt-1 font-medium"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  {emailError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-red-800 font-medium">{emailError}</p>
                        <button
                          onClick={() => setEmailError(null)}
                          className="text-xs text-red-700 hover:text-red-800 mt-1 font-medium"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50">
                      <h2 className="text-xl font-bold text-slate-900">Compose Email</h2>
                    </div>

                    <div className="p-6 space-y-5">
                      {/* Recipient Input */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-bold text-slate-700">
                            To <span className="text-red-500">*</span>
                          </label>
                          <button
                            onClick={() => setShowBulkInput(!showBulkInput)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <Users className="w-3.5 h-3.5" />
                            {showBulkInput ? 'Single Recipient' : 'Bulk Send'}
                          </button>
                        </div>
                        
                        {!showBulkInput ? (
                          <input
                            type="email"
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                            placeholder="recipient@example.com"
                            disabled={isSendingEmail}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed font-medium"
                          />
                        ) : (
                          <textarea
                            value={bulkEmails}
                            onChange={(e) => setBulkEmails(e.target.value)}
                            placeholder="Enter multiple emails separated by commas, semicolons, or new lines"
                            disabled={isSendingEmail}
                            rows={3}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed font-medium text-sm resize-none"
                          />
                        )}
                      </div>

                      {/* Subject Input */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Subject <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            placeholder="Enter email subject"
                            disabled={isSendingEmail}
                            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed font-medium"
                          />
                          {selectedTemplate && (
                            <button
                              onClick={clearTemplate}
                              className="px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
                            >
                              Clear Template
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Template Variables */}
                      {showTemplatePlaceholders && selectedTemplate && emailTemplates[selectedTemplate] && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-blue-900">Template Variables</h4>
                            <button
                              onClick={() => setShowTemplatePlaceholders(false)}
                              className="text-xs text-blue-700 hover:text-blue-800"
                            >
                              Hide
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {emailTemplates[selectedTemplate].placeholders.map((placeholder) => (
                              <div key={placeholder} className="flex items-center gap-2">
                                <span className="text-xs text-blue-700 font-medium min-w-[80px]">{placeholder}:</span>
                                <input
                                  type="text"
                                  value={templateVariables[placeholder] || ''}
                                  onChange={(e) => updateTemplateVariable(placeholder, e.target.value)}
                                  placeholder={`Enter ${placeholder}`}
                                  className="flex-1 text-sm text-black border border-blue-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Body Input */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="Enter your message here..."
                          disabled={isSendingEmail}
                          rows={12}
                          className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed font-medium resize-none"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={testEmailConnection}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-xl transition-colors font-medium"
                          >
                            <Info className="w-4 h-4" />
                            Test Connection
                          </button>
                          <button
                            onClick={() => copyToClipboard(emailBody)}
                            disabled={!emailBody.trim()}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-xl transition-colors font-medium disabled:opacity-50"
                          >
                            <Copy className="w-4 h-4" />
                            Copy
                          </button>
                        </div>
                        <button
                          onClick={sendEmail}
                          disabled={isSendingEmail || (!emailTo.trim() && !bulkEmails.trim()) || !emailSubject.trim() || !emailBody.trim()}
                          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-blue-500/30"
                        >
                          {isSendingEmail ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5" />
                              <span>Send Email</span>
                              {showBulkInput && bulkEmails.trim() && (
                                <span className="ml-2 bg-blue-800 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                  {bulkEmails.split(/[\n,;]/).filter(e => e.trim()).length}
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Email History */}
                  {emailHistory.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden">
                      <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900">Recent Emails</h3>
                        <button
                          onClick={exportEmailHistory}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <Download className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {emailHistory.map((email) => (
                          <div
                            key={email.id}
                            className="px-6 py-4 border-b border-slate-200/60 hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`w-2 h-2 rounded-full ${email.status === 'sent' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                  <p className="text-sm font-semibold text-slate-900 truncate">{email.subject}</p>
                                </div>
                                <p className="text-xs text-slate-600 truncate">To: {email.to}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">
                                  {email.sentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(email.body)}
                                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{email.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Templates & Info */}
                <div className="space-y-6">
                  {/* Email Templates */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Email Templates
                      </h3>
                      <button
                        onClick={loadEmailTemplates}
                        disabled={isLoadingTemplates}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoadingTemplates ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                    
                    <div className="p-4">
                      {isLoadingTemplates ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                      ) : Object.keys(emailTemplates).length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                          <p className="text-sm font-semibold text-slate-700">No templates available</p>
                          <p className="text-xs mt-1">Templates will load automatically</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(emailTemplates).map(([name, template]) => (
                            <button
                              key={name}
                              onClick={() => applyTemplate(name, template)}
                              className={`w-full p-3 border rounded-xl text-left transition-all duration-200 ${
                                selectedTemplate === name
                                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                                  : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${selectedTemplate === name ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-slate-900">{template.name}</p>
                                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.subject}</p>
                                  <div className="flex items-center gap-1 mt-2">
                                    <span className="text-xs text-blue-600 font-medium">Variables:</span>
                                    <span className="text-xs text-slate-500">{template.placeholders.join(', ')}</span>
                                  </div>
                                </div>
                                <ChevronRight className={`w-4 h-4 text-slate-400 ${selectedTemplate === name ? 'text-blue-500' : ''}`} />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email Configuration */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50">
                      <h3 className="text-lg font-bold text-slate-900">Email Configuration</h3>
                    </div>
                    
                    <div className="p-4">
                      {emailConfig ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">Public Key</span>
                            <span className={`text-xs font-bold ${emailConfig.hasPublicKey ? 'text-emerald-600' : 'text-red-600'}`}>
                              {emailConfig.hasPublicKey ? '✓ Configured' : '✗ Missing'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">Secret Key</span>
                            <span className={`text-xs font-bold ${emailConfig.hasSecretKey ? 'text-emerald-600' : 'text-red-600'}`}>
                              {emailConfig.hasSecretKey ? '✓ Configured' : '✗ Missing'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">Credential ID</span>
                            <span className={`text-xs font-bold ${emailConfig.hasCredentialId ? 'text-emerald-600' : 'text-red-600'}`}>
                              {emailConfig.hasCredentialId ? '✓ Configured' : '✗ Missing'}
                            </span>
                          </div>
                          <div className="pt-3 border-t border-slate-200">
                            <p className="text-xs text-slate-500">
                              <span className="font-medium">Environment:</span> {emailConfig.nodeEnv || 'development'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              <span className="font-medium">Server Time:</span> {new Date(emailConfig.serverTime).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                          <p className="text-sm text-slate-500 mt-2">Loading configuration...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
                    <h3 className="text-lg font-bold mb-4">Email Stats</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm">Total Sent</span>
                        </div>
                        <span className="text-xl font-bold">{emailHistory.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Successful</span>
                        </div>
                        <span className="text-xl font-bold">
                          {emailHistory.filter(e => e.status === 'sent').length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Last Sent</span>
                        </div>
                        <span className="text-sm">
                          {emailHistory.length > 0 
                            ? emailHistory[0].sentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Never'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}