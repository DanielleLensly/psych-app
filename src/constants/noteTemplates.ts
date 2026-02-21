export interface NoteTemplate {
  id: string;
  name: string;
  content: string;
  color?: {
    bg: string;
    text: string;
    border: string;
    dot: string;
    hoverBg: string;
  };
}

export const noteTemplates: NoteTemplate[] = [
  {
    id: 'initial_consultation',
    name: 'Initial Consultation',
    color: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
      hoverBg: 'hover:bg-blue-100',
    },
    content: `
      <h3>Initial Consultation</h3>
      <p><strong>Chief Complaint:</strong> </p>
      <p><strong>History of Present Illness (HPI):</strong> </p>
      <p><strong>Past Psychiatric History:</strong> </p>
      <p><strong>Substance Use History:</strong> </p>
      <p><strong>Medical History:</strong> </p>
      <p><strong>Current Medications:</strong> </p>
      <p><strong>Mental Status Examination (MSE):</strong> </p>
      <p><strong>Assessment:</strong> </p>
      <p><strong>Plan:</strong> </p>
    `
  },
  {
    id: 'progress_note_soap',
    name: 'Progress Note',
    color: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
      hoverBg: 'hover:bg-emerald-100',
    },
    content: `
      <h3>Progress Note</h3>
      <p><strong>Subjective:</strong> </p>
      <p><strong>Objective:</strong> </p>
      <p><strong>Assessment:</strong> </p>
      <p><strong>Plan:</strong> </p>
    `
  },
  {
    id: 'treatment_plan_update',
    name: 'Treatment Plan Update',
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      dot: 'bg-purple-500',
      hoverBg: 'hover:bg-purple-100',
    },
    content: `
      <h3>Treatment Plan Update</h3>
      <p><strong>Current Diagnoses:</strong> </p>
      <p><strong>Treatment Goals:</strong> </p>
      <p><strong>Progress Towards Goals:</strong> </p>
      <p><strong>Interventions / Modalities:</strong> </p>
      <p><strong>Updated Plan:</strong> </p>
    `
  },
  {
    id: 'blank',
    name: 'Blank Note',
    color: {
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
      hoverBg: 'hover:bg-slate-100',
    },
    content: '<p></p>'
  }
];
