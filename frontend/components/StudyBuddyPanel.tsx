"use client";

import StudyBuddyChat from "@/components/StudyBuddyChat";
import { LearningContext } from "@/lib/types";

interface Props {
  userId: string;
  questionContext?: string;
  onClose: () => void;
}

export default function StudyBuddyPanel({ userId, questionContext, onClose }: Props) {
  const learningContext: LearningContext | undefined = questionContext
    ? {
        topicId: "ubahan",
        topicName: "Ubahan (Variation)",
        chapterName: "Bab 1",
        pageContext: "general",
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
