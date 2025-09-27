// Mock data for visitor mode
export const mockForms = [
  {
    id: 1,
    title: "Admission Application Form",
    description: "Apply for undergraduate and postgraduate programs",
    category: "Admissions",
    downloadUrl: "https://example.com/forms/admission.pdf",
    lastUpdated: "2024-01-15",
    isPublic: true
  },
  {
    id: 2,
    title: "Scholarship Application",
    description: "Apply for various scholarship programs",
    category: "Financial Aid",
    downloadUrl: "https://example.com/forms/scholarship.pdf",
    lastUpdated: "2024-01-10",
    isPublic: true
  },
  {
    id: 3,
    title: "Hostel Application",
    description: "Apply for on-campus accommodation",
    category: "Accommodation",
    downloadUrl: "https://example.com/forms/hostel.pdf",
    lastUpdated: "2024-01-08",
    isPublic: true
  },
  {
    id: 4,
    title: "Library Membership",
    description: "Register for library access and services",
    category: "Library",
    downloadUrl: "https://example.com/forms/library.pdf",
    lastUpdated: "2024-01-05",
    isPublic: true
  },
  {
    id: 5,
    title: "Transportation Pass",
    description: "Apply for campus transportation services",
    category: "Transportation",
    downloadUrl: "https://example.com/forms/transport.pdf",
    lastUpdated: "2024-01-03",
    isPublic: true
  }
];

export const mockCirculars = [
  {
    id: 1,
    title: "Campus Reopening Guidelines",
    description: "Important guidelines for campus reopening and safety protocols",
    date: "2024-01-20",
    category: "General",
    isPublic: true,
    downloadUrl: "https://example.com/circulars/reopening.pdf"
  },
  {
    id: 2,
    title: "Academic Calendar 2024",
    description: "Complete academic calendar for the year 2024",
    date: "2024-01-18",
    category: "Academic",
    isPublic: true,
    downloadUrl: "https://example.com/circulars/calendar2024.pdf"
  },
  {
    id: 3,
    title: "Examination Schedule",
    description: "Schedule for mid-term and final examinations",
    date: "2024-01-15",
    category: "Examinations",
    isPublic: true,
    downloadUrl: "https://example.com/circulars/exam-schedule.pdf"
  },
  {
    id: 4,
    title: "Library Hours Update",
    description: "Updated library operating hours and services",
    date: "2024-01-12",
    category: "Library",
    isPublic: true,
    downloadUrl: "https://example.com/circulars/library-hours.pdf"
  },
  {
    id: 5,
    title: "Sports Facilities",
    description: "Information about sports facilities and activities",
    date: "2024-01-10",
    category: "Sports",
    isPublic: true,
    downloadUrl: "https://example.com/circulars/sports-facilities.pdf"
  }
];

export const mockFaculties = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    department: "Computer Science",
    designation: "Professor",
    email: "sarah.johnson@university.edu",
    phone: "+1-555-0101",
    office: "CS-101",
    availability: "Available",
    nextAvailable: "2024-01-25 10:00 AM",
    specializations: ["Machine Learning", "Data Science", "AI"],
    officeHours: "Mon-Fri 9:00 AM - 5:00 PM"
  },
  {
    id: 2,
    name: "Prof. Michael Chen",
    department: "Electrical Engineering",
    designation: "Associate Professor",
    email: "michael.chen@university.edu",
    phone: "+1-555-0102",
    office: "EE-205",
    availability: "Busy",
    nextAvailable: "2024-01-25 2:00 PM",
    specializations: ["Power Systems", "Renewable Energy", "Control Systems"],
    officeHours: "Mon-Wed-Fri 10:00 AM - 4:00 PM"
  },
  {
    id: 3,
    name: "Dr. Emily Rodriguez",
    department: "Mathematics",
    designation: "Assistant Professor",
    email: "emily.rodriguez@university.edu",
    phone: "+1-555-0103",
    office: "MATH-150",
    availability: "Available",
    nextAvailable: "2024-01-25 11:00 AM",
    specializations: ["Calculus", "Linear Algebra", "Statistics"],
    officeHours: "Tue-Thu 9:00 AM - 3:00 PM"
  },
  {
    id: 4,
    name: "Prof. David Kim",
    department: "Mechanical Engineering",
    designation: "Professor",
    email: "david.kim@university.edu",
    phone: "+1-555-0104",
    office: "ME-301",
    availability: "On Leave",
    nextAvailable: "2024-02-01 9:00 AM",
    specializations: ["Thermodynamics", "Fluid Mechanics", "Design"],
    officeHours: "Mon-Fri 8:00 AM - 6:00 PM"
  },
  {
    id: 5,
    name: "Dr. Lisa Wang",
    department: "Physics",
    designation: "Associate Professor",
    email: "lisa.wang@university.edu",
    phone: "+1-555-0105",
    office: "PHYS-220",
    availability: "Available",
    nextAvailable: "2024-01-25 1:00 PM",
    specializations: ["Quantum Physics", "Optics", "Electromagnetism"],
    officeHours: "Mon-Fri 10:00 AM - 5:00 PM"
  }
];

export const mockChatbotResponses = [
  {
    query: "What are the admission requirements?",
    response: "For undergraduate programs, you need a high school diploma with minimum 60% marks. For postgraduate programs, a bachelor's degree with 55% marks is required. You can find detailed requirements in our admission forms section."
  },
  {
    query: "How can I apply for scholarships?",
    response: "Scholarship applications are available in the Forms section. You can download the scholarship application form and submit it along with required documents. The deadline for most scholarships is March 31st."
  },
  {
    query: "What are the library hours?",
    response: "The library is open Monday to Friday from 8:00 AM to 10:00 PM, and on weekends from 9:00 AM to 6:00 PM. You can find the complete schedule in our circulars section."
  },
  {
    query: "How do I contact faculty members?",
    response: "You can find faculty contact information in the Faculty Finder section. Each faculty member's email, phone, and office hours are listed. You can also check their availability status."
  },
  {
    query: "What facilities are available on campus?",
    response: "Our campus offers various facilities including library, sports complex, hostel accommodation, cafeteria, and transportation services. You can find detailed information about each facility in our circulars and forms sections."
  },
  {
    query: "How can I get a transportation pass?",
    response: "Transportation passes are available through the Forms section. Download the transportation pass application form, fill it out, and submit it to the transportation office along with required documents."
  }
];

export const getMockChatbotResponse = (query) => {
  const lowerQuery = query.toLowerCase();
  
  // Check for exact matches first
  for (const mockResponse of mockChatbotResponses) {
    if (lowerQuery.includes(mockResponse.query.toLowerCase())) {
      return mockResponse.response;
    }
  }
  
  // Check for keyword matches
  if (lowerQuery.includes('admission') || lowerQuery.includes('apply')) {
    return "For admission information, please check our Forms section where you can find the admission application form and requirements.";
  }
  
  if (lowerQuery.includes('scholarship') || lowerQuery.includes('financial aid')) {
    return "Scholarship applications are available in our Forms section. You can download and submit the scholarship application form.";
  }
  
  if (lowerQuery.includes('library') || lowerQuery.includes('books')) {
    return "Library information including hours and services can be found in our Circulars section. You can also apply for library membership through our Forms section.";
  }
  
  if (lowerQuery.includes('faculty') || lowerQuery.includes('professor') || lowerQuery.includes('teacher')) {
    return "Faculty information and contact details are available in our Faculty Finder section. You can check their availability and office hours.";
  }
  
  if (lowerQuery.includes('transport') || lowerQuery.includes('bus')) {
    return "Transportation services information is available in our Circulars section. You can apply for a transportation pass through our Forms section.";
  }
  
  if (lowerQuery.includes('hostel') || lowerQuery.includes('accommodation')) {
    return "Hostel accommodation information and application forms are available in our Forms section.";
  }
  
  // Default response
  return "I can help you with information about admissions, scholarships, library services, faculty contacts, transportation, and accommodation. Please check our Forms and Circulars sections for detailed information, or use the Faculty Finder to contact specific professors.";
};
