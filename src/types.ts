export interface UserProfile {
  id: string;
  username: string;
  name: string;
  nickname: string;
  avatar: string;
  birthday: string;
  email: string;
  address: string;
  bio: string;
  socialGithub: string;
  socialLinkedin: string;
  socialTwitter: string;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  category: "Frontend" | "Backend" | "Database" | "Cloud" | "AI" | "Tools";
  level: number;
  iconName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  gallery: string[];
  githubUrl?: string;
  demoUrl?: string;
  techStack: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Roadmap {
  id: string;
  title: string;
  description?: string;
  status: "Completed" | "Learning" | "Future";
  order: number;
  date?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  description: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Certificate {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  credentialUrl?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  site_title?: string;
  site_description?: string;
  hero_title?: string;
  hero_subtitle?: string;
  status_active?: string;
  [key: string]: string | undefined;
}
