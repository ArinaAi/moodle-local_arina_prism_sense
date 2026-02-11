/**
 * Global window extensions for LectureBot
 */
export { };

declare global {
  interface Window {
    MOODLE_CONTEXT?: {
      userid: number;
      tenantid: number;
      courseid: number;
      coursename: string;
      sesskey: string;
      wwwroot: string;
      sections: Array<{
        id: number;
        name: string;
        section: number;
      }>;
    };
    LectureBot?: {
      init: () => void;
    };
    initLectureBot?: () => void;
    local_lecturebot?: {
      init: () => void;
    };
    initLectureBotGlobal?: () => void;
  }
}
