"use client";

import StudyBuddyChat from "@/components/StudyBuddyChat";
import { LearningContext, TopicId } from "@/lib/types";

const TOPIC_ID_MAP: Record<string, TopicId> = {
  matriks: "matriks",
  insurans: "insurans",
  ubahan: "ubahan",
};

const TOPIC_DISPLAY_NAME: Record<TopicId, string> = {
  ubahan: "Ubahan (Variation)",
  matriks: "Matriks (Matrices)",
  insurans: "Insurans (Insurance)",
};

function toTopicId(raw?: string): TopicId {
  const s = raw?.toLowerCase() ?? "";
  for (const key of Object.keys(TOPIC_ID_MAP)) {
    if (s.includes(key)) return TOPIC_ID_MAP[key];
  }
  return "ubahan";
}

interface Props {
  userId: string;
  questionContext?: string;
  topicId?: string;
  topicName?: string;
  chapterName?: string;
  onClose: () => void;
}

export default function StudyBuddyPanel({ userId, questionContext, topicId, topicName, chapterName, onClose }: Props) {
  const resolvedTopicId = toTopicId(topicId ?? topicName);
  const resolvedTopicName = topicName ?? TOPIC_DISPLAY_NAME[resolvedTopicId];

  const learningContext: LearningContext | undefined = questionContext
    ? {
        topicId: resolvedTopicId,
        topicName: resolvedTopicName,
        chapterName: chapterName,
        pageContext: "quiz",
        currentQuestion: {
          id: "inline-context",
          text: questionContext,
          options: [],
          difficulty: "medium",
        },
      }
    : undefined;

  return (
    <StudyBuddyChat
      userId={userId}
      learningContext={learningContext}
      isOpen
      onClose={onClose}
    />
  );
}
