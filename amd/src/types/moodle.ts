export interface MoodleSection {
  id: number;
  name: string;
  section: number;
}

export interface MoodleContext {
  userid: number;
  orgid: string | null;
  courseid: number;
  coursename: string;
  sesskey: string;
  wwwroot: string;
  sections: MoodleSection[];
  canApprove: boolean;
}
