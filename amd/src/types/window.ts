/**
 * Global window extensions for LectureBot
 */
export { };

declare global {
  interface Window {
    MOODLE_CONTEXT?: {
      userid: number;
      tenantid: string | null;
      courseid: number;
      coursename: string;
      sesskey: string;
      wwwroot: string;
      sections: Array<{
        id: number;
        name: string;
        section: number;
      }>;
      canApprove: boolean;
    };
    /** Injected by cms.php for the CMS dashboard React app. */
    MOODLE_CMS_CONTEXT?: {
      wwwroot: string;
      sesskey: string;
      userid: number;
      tenantid: number;
      username: string;
      useremail: string;
    };
    LectureBot?: {
      init: () => void;
    };
    initLectureBot?: () => void;
    local_arina_prism_sense?: {
      init: () => void;
    };
    initLectureBotGlobal?: () => void;
  }
}
