/**
 * Global window extensions for ArinaPrismSense
 */
export { };

declare global {
  interface Window {
    MOODLE_CONTEXT?: {
      userid: number;
      orgid: string | null;
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
      orgid: string | null;
      username: string;
      useremail: string;
    };
    ArinaPrismSense?: {
      init: () => void;
    };
    initArinaPrismSense?: () => void;
    local_arina_prism_sense?: {
      init: () => void;
    };
    initArinaPrismSenseGlobal?: () => void;
  }
}
