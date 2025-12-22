export interface MoodleSection {
  id: number;
  name: string;
  section: number;
}

export interface MoodleContext {
  courseid: number;
  coursename: string;
  sesskey: string;
  wwwroot: string;
  sections: MoodleSection[];
}
