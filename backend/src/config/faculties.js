'use strict';

/** Canonical faculty → department catalog (Taraba State University).
 *  Used by the SQLite dev seeder and referenced by schema.sql/seed.sql. */
const FACULTIES = [
  {
    name: 'Faculty of Arts & Humanities',
    departments: [
      'English Language',
      'Literature in English',
      'History & International Studies',
      'Religious Studies',
      'Philosophy',
      'Linguistics',
      'Theatre & Performing Arts',
      'Music',
      'Foreign Languages',
    ],
  },
  {
    name: 'Faculty of Social Sciences',
    departments: [
      'Economics',
      'Political Science',
      'Sociology',
      'Psychology',
      'Criminology & Security Studies',
      'Social Work',
      'Geography & Environmental Management',
      'Public Administration',
    ],
  },
  {
    name: 'Faculty of Management Sciences',
    departments: [
      'Accounting',
      'Banking & Finance',
      'Business Administration',
      'Marketing',
      'Entrepreneurship',
      'Insurance',
      'Actuarial Science',
      'Human Resource Management',
    ],
  },
  {
    name: 'Faculty of Sciences',
    departments: [
      'Mathematics',
      'Statistics',
      'Physics',
      'Chemistry',
      'Biology',
      'Microbiology',
      'Biochemistry',
      'Geology',
      'Environmental Science',
    ],
  },
  {
    name: 'Faculty of Engineering',
    departments: [
      'Civil Engineering',
      'Mechanical Engineering',
      'Electrical/Electronics Engineering',
      'Chemical Engineering',
      'Petroleum Engineering',
      'Mechatronics Engineering',
      'Agricultural Engineering',
      'Biomedical Engineering',
      'Environmental Engineering',
    ],
  },
  {
    name: 'Faculty of Education',
    departments: [
      'Education & English',
      'Education & Biology',
      'Education & Chemistry',
      'Education & Mathematics',
      'Education & Physics',
      'Educational Management',
      'Guidance & Counselling',
      'Early Childhood Education',
      'Primary Education',
      'Special Education',
      'Adult Education',
      'Physical & Health Education',
      'Vocational & Technical Education',
    ],
  },
  {
    name: 'Faculty of Law',
    departments: [
      'Law (LL.B)',
      'Legal Studies',
      'International/Comparative Law',
      'Commercial Law',
      'Public/Constitutional Law',
    ],
  },
  {
    name: 'Faculty of Health Sciences',
    departments: [
      'Medicine & Surgery',
      'Nursing Science',
      'Medical Laboratory Science',
      'Public Health',
      'Physiotherapy',
      'Radiography',
      'Human Anatomy',
      'Human Physiology',
      'Pharmacy',
      'Dentistry',
      'Nutrition & Dietetics',
    ],
  },
  {
    name: 'Faculty of Agriculture',
    departments: [
      'Agricultural Economics',
      'Agricultural Extension',
      'Animal Science',
      'Crop Science',
      'Soil Science',
      'Fisheries & Aquaculture',
      'Forestry & Wildlife Management',
      'Agricultural Science',
    ],
  },
  {
    name: 'Faculty of Environmental Sciences',
    departments: [
      'Architecture',
      'Quantity Surveying',
      'Estate Management',
      'Urban & Regional Planning',
      'Building Technology',
      'Surveying & Geoinformatics',
      'Environmental Management',
    ],
  },
  {
    name: 'Faculty of Communication & Media',
    departments: [
      'Mass Communication',
      'Journalism',
      'Public Relations',
      'Advertising',
      'Broadcasting',
      'Film & Multimedia Studies',
      'Digital Media',
    ],
  },
  {
    name: 'Faculty of Computing and Artificial Intelligence',
    departments: [
      'Computer Science',
      'Information Technology',
      'Software Engineering',
      'Cybersecurity',
      'Data Science',
      'Artificial Intelligence',
      'Information Systems',
      'Computer Engineering',
    ],
  },
];

/** Clearance workflow units (in approval order). */
const CLEARANCE_UNITS = [
  { code: 'HOD', name: 'Departmental / HOD Clearance', sort: 1 },
  { code: 'LIBRARY', name: 'University Library', sort: 2 },
  { code: 'BURSARY', name: 'Bursary & Finance', sort: 3 },
  { code: 'STUDENT_AFFAIRS', name: 'Student Affairs Division', sort: 4 },
  { code: 'REGISTRY', name: 'Registry / Senate', sort: 5 },
];

module.exports = { FACULTIES, CLEARANCE_UNITS };