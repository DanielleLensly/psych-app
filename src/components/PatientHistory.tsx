import AppointmentsList from './AppointmentsList';
import CommentsList from './CommentsList';

interface PatientHistoryProps {
  patientId: string;
}

export default function PatientHistory({ patientId }: PatientHistoryProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Patient History</h2>
        <p className="text-slate-500 text-sm">Timeline of appointments and administrative logs.</p>
      </div>

      <AppointmentsList patientId={patientId} />

      <div className="my-8 border-t border-slate-100"></div>

      <CommentsList patientId={patientId} />
    </div>
  );
}
