import { useState, useEffect, useRef } from 'react';
import { Users, Calendar, FileText, Search, Filter, Download, Upload, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PatientNotes from '../components/PatientNotes';
import { Patient } from '../types/index';
import { exportService } from '../lib/exportService';
import { importService } from '../lib/importService';

export default function Dashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('full_name', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by status manually if the DB doesn't have a strict enum or if it's mixed
      let filteredData = data || [];
      if (statusFilter !== 'all') {
        // Assuming status might be stored in metadata or a specific column (we added a basic eq check earlier, but keeping it simple here)
        filteredData = filteredData.filter(p => !p.status || p.status === statusFilter || statusFilter === 'all');
      }

      setPatients(filteredData);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchPatients();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, statusFilter]);

  const handleExport = (format: 'excel' | 'pdf' | 'word') => {
    const exportData = patients.map(p => ({
      ID: p.id,
      Name: p.full_name || 'N/A',
      Email: p.email || 'N/A',
      Phone: p.phone || 'N/A',
      Role: p.role || 'patient',
      Updated: new Date(p.updated_at || Date.now()).toLocaleDateString()
    }));

    if (format === 'excel') {
      exportService.exportToExcel(exportData, 'Patients_List');
    } else if (format === 'pdf') {
      const headers = ['Name', 'Email', 'Phone', 'Role', 'Updated'];
      const rows = patients.map(p => [
        p.full_name || 'N/A',
        p.email || 'N/A',
        p.phone || 'N/A',
        p.role || 'patient',
        new Date(p.updated_at || Date.now()).toLocaleDateString()
      ]);
      exportService.exportListToPDF(headers, rows, 'Patients List', 'Patients_List');
    } else if (format === 'word') {
      let html = '<table border="1" style="border-collapse: collapse; width: 100%;"><thead><tr>';
      html += '<th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Updated</th></tr></thead><tbody>';
      patients.forEach(p => {
        html += `<tr>
          <td>${p.full_name || 'N/A'}</td>
          <td>${p.email || 'N/A'}</td>
          <td>${p.phone || 'N/A'}</td>
          <td>${p.role || 'patient'}</td>
          <td>${new Date(p.updated_at || Date.now()).toLocaleDateString()}</td>
        </tr>`;
      });
      html += '</tbody></table>';
      exportService.exportHtmlToWord(html, 'Patients_List', 'Patients List');
    }
    setShowExportMenu(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = await importService.importExcel(file);

        // Map the Excel rows to Database structure
        const mappedData = data.map((row: any) => {
          // Generate an ID for imported patients since they aren't going through regular Auth signup
          // (assuming they don't log in directly but act as records for the psychologist)
          const patientId = crypto.randomUUID();

          return {
            id: patientId,
            full_name: row.Name || row.full_name || 'Imported Patient',
            email: row.Email || row.email || null,
            phone: row.Phone || row.phone || null,
            role: row.Role || row.role || 'patient',
            status: row.Status || row.status || 'in-patient',
            updated_at: new Date().toISOString()
          };
        });

        // Batch insert into Profiles table
        const { error } = await supabase.from('profiles').insert(mappedData);

        if (error) {
          console.error('Supabase bulk insert failure:', error);
          throw error;
        }

        alert(`Successfully imported ${data.length} records!`);
        fetchPatients();
      } else {
        alert('Please upload an Excel file for bulk patient import.');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      alert(`Failed to import file: ${error.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Layout title="Dashboard" subtitle="Welcome back">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Total Patients</h3>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">{patients.length}</p>
          <p className="text-green-600 text-sm mt-2 flex items-center gap-1">
            Active Records
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Appointments</h3>
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">0</p>
          <p className="text-slate-600 text-sm mt-2">
            Scheduled for today
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Pending Notes</h3>
            <FileText className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-slate-800">0</p>
          <p className="text-amber-600 text-sm mt-2">
            Action required
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800 text-lg">Recent Patients</h3>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 mr-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImport}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Import
                </button>

                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg border border-blue-200 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-20">
                      <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600">Export as Excel (.xlsx)</button>
                      <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600">Export as PDF (.pdf)</button>
                      <button onClick={() => handleExport('word')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600">Export as Word (.docx)</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  data-testid="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="in-patient">In-Patient</option>
                  <option value="out-patient">Out-Patient</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading patients...</div>
          ) : patients.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No patients found.</div>
          ) : (
            patients.map((patient) => (
              <div
                key={patient.id}
                className="p-4 hover:bg-blue-50 transition-all duration-200 flex items-center justify-between cursor-pointer border-l-4 border-transparent hover:border-blue-500"
                onClick={() => navigate(`/patients/${patient.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-medium">
                    {patient.full_name?.[0]?.toUpperCase() || 'P'}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">{patient.full_name || 'Unnamed Patient'}</h4>
                    <p className="text-sm text-slate-500">Last updated: {new Date(patient.updated_at || Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/patients/${patient.id}`);
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View Profile
                </button>
              </div>
            ))
          )}
        </div>
      </div>


      {/* Patient Notes - Encrypted */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
        <PatientNotes />

        {/* Placeholder for future features or additional encrypted data */}
        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 p-8">
          <h3 className="font-medium text-slate-500 mb-2">Upcoming Feature</h3>
          <p className="text-sm text-center max-w-xs">
            More encrypted modules will be available here soon.
          </p>
        </div>
      </div>
    </Layout >
  );
}
