export type Student = {
  id: string;
  first_name: string;
  last_name: string;
  parent_name: string;
  phone: string | null;
  class: string;
  enrollment_date: string | null;
  status: string;
  image_url: string | null;
  created_at: string;
};

export type Teacher = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  class: string | null;
  hire_date: string | null;
  created_at: string;
};

export type Course = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  teacher_id: string | null;
  level: string | null;
  class: string | null;
  created_at: string;
};

export type Enrollment = {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
};

export type Attendance = {
  id: string;
  enrollment_id: string | null;
  teacher_id: string | null;
  date: string;
  status: string;
  notes: string | null;
};

export type Grade = {
  id: string;
  enrollment_id: string;
  title: string;
  score: number;
  max_score: number;
  graded_at: string | null;
  created_at: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type StudentStatus = 'active' | 'inactive' | 'graduated';

export type CourseWithTeacher = Course & {
  teacher: Teacher | null;
};

export type EnrollmentWithDetails = Enrollment & {
  student: Student;
  course: Course;
};

export type ReportCard = {
  id: string;
  student_id: string | null;
  pupil_name: string;
  class_form: string;
  term: string;
  academic_year: string;
  vacation_date: string;
  reopening_date: string;
  next_term_fees: string;
  fees_in_arrears: string;
  total_fees_due: string;
  no_on_roll: number;
  days_out: number;
  repeated: boolean;
  promoted_to: string;
  overall_grade: string;
  attendance: number;
  conduct: string;
  interest: string;
  teachers_remarks: string;
  headmaster_remarks: string;
  header_image_url: string | null;
  position: number | null;
  created_at: string;
};

export type ReportCardSubject = {
  id: string;
  report_card_id: string;
  subject_name: string;
  class_score: number;
  exam_score: number;
  total: number;
  grade: number;
  grade_label: string;
  teacher_remarks: string;
  sort_order: number;
};

export const DEFAULT_SUBJECTS = [
  'MATHEMATICS',
  'ENG. LANGUAGE',
  'INTEGRATED SCI.',
  'HISTORY',
  'COMPUTING',
  'R.M.E',
  'CREATIVE ART',
  'GHANAIAN LAN.',
  'OWOP',
];

export type FeePayment = {
  id: string;
  receipt_no: string;
  student_id: string | null;
  student_name: string;
  class_form: string;
  amount: number;
  amount_in_words: string;
  payment_type: string;
  payment_method: string;
  payment_date: string;
  term: string;
  academic_year: string;
  notes: string;
  created_at: string;
};

export function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function below1000(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + below1000(num % 100) : '');
  }
  const integer = Math.floor(Math.abs(n));
  const dec = Math.round((Math.abs(n) - integer) * 100);
  let result = '';
  if (integer >= 1_000_000) result += below1000(Math.floor(integer / 1_000_000)) + ' Million ';
  if (integer >= 1_000) result += below1000(Math.floor((integer % 1_000_000) / 1_000)) + ' Thousand ';
  if (integer % 1_000 > 0) result += below1000(integer % 1_000);
  result = result.trim();
  if (dec > 0) result += ' and ' + below1000(dec) + ' Cents';
  return (n < 0 ? 'Negative ' : '') + result + ' Only';
}

export function calcGrade(total: number): { grade: number; label: string; remark: string } {
  if (total >= 80) return { grade: 1, label: 'EXL', remark: 'Excellent' };
  if (total >= 75) return { grade: 2, label: 'V.GOOD', remark: 'Very Good' };
  if (total >= 70) return { grade: 3, label: 'GOOD', remark: 'Good' };
  if (total >= 65) return { grade: 4, label: 'SATIS.', remark: 'Satisfactory' };
  if (total >= 60) return { grade: 5, label: 'CREDIT', remark: 'Credit' };
  if (total >= 55) return { grade: 6, label: 'PASS', remark: 'Pass' };
  if (total >= 50) return { grade: 7, label: 'PASS', remark: 'Pass' };
  if (total >= 40) return { grade: 8, label: 'POOR', remark: 'Poor' };
  return { grade: 9, label: 'FAIL', remark: 'Fail' };
}
