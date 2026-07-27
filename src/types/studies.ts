export type TopicStatus = "pending" | "in_progress" | "done";
export type ResourceType = "youtube" | "note" | "code";

export interface StudyProject {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  emoji: string;
  created_at: string;
}

export interface StudyProjectWithStats extends StudyProject {
  total_topics: number;
  done_topics: number;
}

export type StudyLinkKind = "link" | "tool";

export interface StudyLinkItem {
  id: string;
  kind: StudyLinkKind;
  name: string;
  url: string | null;
  note: string | null;
  created_at: string;
}

export interface StudyTrack {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface StudyTopic {
  id: string;
  track_id: string;
  user_id: string;
  title: string;
  status: TopicStatus;
  sort_order: number;
  created_at: string;
}

export interface TopicResource {
  id: string;
  topic_id: string;
  user_id: string;
  type: ResourceType;
  title: string | null;
  url: string | null;
  content: string | null;
  sort_order: number;
  created_at: string;
}

export interface StudyTest {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface TestQuestion {
  id: string;
  test_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  sort_order: number;
}

export interface TestAttempt {
  id: string;
  test_id: string;
  user_id: string;
  score: number;
  total: number;
  answers: number[];
  completed_at: string;
}

export interface StudyTrackWithTopics extends StudyTrack {
  topics: StudyTopic[];
}
