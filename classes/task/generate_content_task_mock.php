<?php
namespace local_lecturebot\task;

defined('MOODLE_INTERNAL') || die();

class generate_content_task_mock extends \core\task\adhoc_task
{
    public function execute()
    {
        global $DB, $CFG;

        $data = $this->get_custom_data();
        // Fix key mismatch: generate_content.php passes 'content_id'
        if (isset($data->content_id)) {
            $contentId = $data->content_id;
        } elseif (isset($data->contentid)) {
            $contentId = $data->contentid;
        } else {
            $contentId = 0;
        }
        $avatarVideoNeeded = isset($data->avtar_video_needed) ? $data->avtar_video_needed : 'no';

        error_log("LectureBot [Mock]: Task STARTED for Content ID: $contentId");

        // 1. Simulate Delay (15s to allow UI Polling to triggers)
        sleep(15);

        // 2. Fetch Content
        $content = $DB->get_record('local_lecturebot_content', ['id' => $contentId]);
        if (!$content) {
            error_log("LectureBot [Mock]: Content ID $contentId not found.");
            return;
        }

        error_log("LectureBot [Mock]: Processing Content: {$content->title}");

        // 3. Update Status to READY immediately
        try {
            $updatedContent = new \stdClass();
            $updatedContent->id = $contentId;
            $updatedContent->status = 'ready'; // Success!
            $updatedContent->timemodified = time();
            
            // Populate Fake Data
            $fakeGenerationData = [
                'azure_folder' => 'mock_folder', // Helper for get_slide_images
                'azure_url' => 'https://mock-url',
                'slide_count' => 5,
                'credits_deducted' => 10
            ];
            
            $contentType = isset($data->content_type) ? $data->content_type : 'slides';

            // If Video Requested (Explicit or Implicit)
            if ($contentType === 'video' || $avatarVideoNeeded === 'yes') {
                 $fakeGenerationData['video_url'] = 'https://www.w3schools.com/html/mov_bbb.mp4'; // Dummy video
                 $fakeGenerationData['video_duration'] = 120;
                 $fakeGenerationData['video_file'] = 'mock_video_file.mp4';
                 $fakeGenerationData['video_path'] = '/tmp/mock_video_not_real.mp4';
                 
                 // Populate standard 'result' structure for frontend

                 $fakeGenerationData['result'] = [
                    'status' => 'success',
                    'results' => [
                        [
                            'topic' => $content->title,
                            'videoUrl' => 'https://www.w3schools.com/html/mov_bbb.mp4',
                            'videoDuration' => 120,
                            'slideCount' => 0 // Or keep slide count if hybrid
                        ]
                    ]
                 ];
            }

            $updatedContent->generationdata = json_encode($fakeGenerationData);

            $DB->update_record('local_lecturebot_content', $updatedContent);
            error_log("LectureBot [Mock]: Content ID $contentId updated to READY.");

        } catch (\Exception $e) {
            error_log("LectureBot [Mock]: Error updating mock record: " . $e->getMessage());
            // Update to error
            $errContent = new \stdClass();
            $errContent->id = $contentId;
            $errContent->status = 'error';
            $errContent->errormessage = "Mock Error: " . $e->getMessage();
            $DB->update_record('local_lecturebot_content', $errContent);
        }

        error_log("LectureBot [Mock]: Task COMPLETED");
    }
}
