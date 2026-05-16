"use client";

import React, { useMemo, useState } from "react";

type NodeStatus = "completed" | "current" | "locked";
type StageType = "Lesson" | "Practice" | "Mastery";
type MaterialType = "content" | "exercise_1" | "exercise_2" | "assessment";

type MaterialSubtopic = {
  id: "1.1" | "1.2" | "1.3";
  title: string;
  meaning: string;
  relation?: string;
  equation?: string;
  graph?: string;
  generalForm?: string;
};

type MapNode = {
  id: number;
  topic: string;
  stage: StageType;
  status: NodeStatus;
  xp?: number;
  stars?: number;
  subtopicId: MaterialSubtopic["id"];
  materialType: MaterialType;
  materialTitle: string;
  materialPrompt: string;
  task?: string;
  hint?: string;
};

type JourneyProfile = {
  studentName: string;
  form: string;
  xp: number;
  completedLevels: number;
  totalLevels: number;
  currentTopic: string;
  aiMessage: string;
};

const SUBTOPICS: MaterialSubtopic[] = [
  {
    id: "1.1",
    title: "Ubahan Langsung",
    meaning:
      "Hubungan di mana apabila satu pemboleh ubah y bertambah, maka pemboleh ubah x juga bertambah pada kadar yang sama dan sebaliknya.",
    relation: "y berkadar terus dengan x^n",
    equation: "y = kx^n, dengan keadaan k ialah pemalar.",
    graph: "Graf y melawan x^n ialah satu garis lurus yang melalui asalan.",
  },
  {
    id: "1.2",
    title: "Ubahan Songsang",
    meaning:
      "Hubungan di mana pemboleh ubah y bertambah apabila pemboleh ubah x berkurang pada kadar yang sama dan sebaliknya.",
    relation: "y berkadar songsang dengan x^n",
    equation: "y = k / x^n, dengan keadaan k ialah pemalar.",
    graph:
      "Graf y melawan x berbentuk hiperbola, manakala graf y melawan 1 / x^n ialah satu garis lurus yang bermula daripada asalan.",
  },
  {
    id: "1.3",
    title: "Ubahan Bergabung",
    meaning: "Melibatkan gabungan ubahan langsung atau ubahan tercantum dan ubahan songsang.",
    generalForm: "Bentuk umum: y berkadar dengan x^m / z^n dan persamaan y = kx^m / z^n.",
  },
];

const MAP_NODES: MapNode[] = [
  {
    id: 1,
    topic: "Subtopic 1.1",
    stage: "Lesson",
    status: "completed",
    xp: 40,
    stars: 3,
    subtopicId: "1.1",
    materialType: "content",
    materialTitle: "No.1 Learning content subtopic 1.1",
    materialPrompt: "Baca konsep asas Ubahan Langsung.",
  },
  {
    id: 2,
    topic: "Subtopic 1.1",
    stage: "Practice",
    status: "completed",
    xp: 30,
    stars: 3,
    subtopicId: "1.1",
    materialType: "exercise_1",
    materialTitle: "No.2 Exercise subtopic 1.1",
    materialPrompt: "Kenal pasti hubungan y berkadar dengan x^n.",
    task: "Semak jadual nilai dan tentukan sama ada y / x^n ialah pemalar.",
    hint: "Jika nisbah kekal sama, itu ubahan langsung.",
  },
  {
    id: 3,
    topic: "Subtopic 1.1",
    stage: "Practice",
    status: "completed",
    xp: 30,
    stars: 2,
    subtopicId: "1.1",
    materialType: "exercise_2",
    materialTitle: "No.3 Exercise subtopic 1.1",
    materialPrompt: "Selesaikan nilai tidak diketahui untuk y = kx^n.",
    task: "Cari k menggunakan satu pasangan nilai, kemudian kira nilai baharu.",
    hint: "Langkah: bentuk persamaan, ganti nilai, cari k, jawab.",
  },
  {
    id: 4,
    topic: "Subtopic 1.1",
    stage: "Mastery",
    status: "completed",
    xp: 50,
    stars: 3,
    subtopicId: "1.1",
    materialType: "assessment",
    materialTitle: "No.4 Assessment subtopic 1.1",
    materialPrompt: "Uji kefahaman maksud, persamaan, dan graf ubahan langsung.",
    task: "Jawab set ringkas soalan campuran berkaitan subtopic 1.1.",
    hint: "Fokus pada definisi, k, dan garis lurus melalui asalan.",
  },
  {
    id: 5,
    topic: "Subtopic 1.2",
    stage: "Lesson",
    status: "current",
    xp: 40,
    subtopicId: "1.2",
    materialType: "content",
    materialTitle: "No.5 Learning content subtopic 1.2",
    materialPrompt: "Baca konsep asas Ubahan Songsang.",
  },
  {
    id: 6,
    topic: "Subtopic 1.2",
    stage: "Practice",
    status: "locked",
    subtopicId: "1.2",
    materialType: "exercise_1",
    materialTitle: "No.6 Exercise subtopic 1.2",
    materialPrompt: "Kenal pasti hubungan y berkadar songsang dengan x^n.",
    task: "Semak hasil darab yx^n dan tentukan sama ada ia pemalar.",
    hint: "Jika hasil darab kekal sama, itu ubahan songsang.",
  },
  {
    id: 7,
    topic: "Subtopic 1.2",
    stage: "Practice",
    status: "locked",
    subtopicId: "1.2",
    materialType: "exercise_2",
    materialTitle: "No.7 Exercise subtopic 1.2",
    materialPrompt: "Guna y = k / x^n untuk cari nilai tidak diketahui.",
    task: "Cari k dahulu, kemudian gantikan nilai x baharu.",
    hint: "Elak salah songsangkan x^n semasa pengiraan.",
  },
  {
    id: 8,
    topic: "Subtopic 1.2",
    stage: "Mastery",
    status: "locked",
    subtopicId: "1.2",
    materialType: "assessment",
    materialTitle: "No.8 Assessment subtopic 1.2",
    materialPrompt: "Uji kefahaman maksud, persamaan, dan graf ubahan songsang.",
    task: "Jawab soalan campuran termasuk tafsiran graf hiperbola.",
    hint: "Bezakan graf y melawan x dan graf y melawan 1 / x^n.",
  },
  {
    id: 9,
    topic: "Subtopic 1.3",
    stage: "Lesson",
    status: "locked",
    subtopicId: "1.3",
    materialType: "content",
    materialTitle: "No.9 Learning content subtopic 1.3",
    materialPrompt: "Baca konsep asas Ubahan Bergabung.",
  },
  {
    id: 10,
    topic: "Subtopic 1.3",
    stage: "Practice",
    status: "locked",
    subtopicId: "1.3",
    materialType: "exercise_1",
    materialTitle: "No.10 Exercise subtopic 1.3",
    materialPrompt: "Kenal pasti pemboleh ubah yang berkadar terus dan songsang.",
    task: "Tulis hubungan ubahan sebelum membina persamaan.",
    hint: "Asingkan faktor di pembilang dan penyebut.",
  },
  {
    id: 11,
    topic: "Subtopic 1.3",
    stage: "Practice",
    status: "locked",
    subtopicId: "1.3",
    materialType: "exercise_2",
    materialTitle: "No.11 Exercise subtopic 1.3",
    materialPrompt: "Bina persamaan y = kx^m / z^n dan cari k.",
    task: "Guna data diberi untuk tentukan k sebelum kira nilai akhir.",
    hint: "Tulis kuasa pemboleh ubah dengan betul sebelum mengganti nilai.",
  },
  {
    id: 12,
    topic: "Subtopic 1.3",
    stage: "Mastery",
    status: "locked",
    subtopicId: "1.3",
    materialType: "assessment",
    materialTitle: "No.12 Assessment subtopic 1.3",
    materialPrompt: "Uji kefahaman gabungan ubahan langsung dan songsang.",
    task: "Selesaikan set ringkas soalan perwakilan formula dan pengiraan.",
    hint: "Pastikan susunan x^m / z^n tidak tertukar.",
  },
];

function XPBadge({ value }: { value: number }) {
  return <span className="map-xp-badge">+{value} XP</span>;
}

function StarRating({ stars = 0 }: { stars?: number }) {
  return (
    <div className="map-stars" aria-label={`${stars} stars`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < stars ? "map-star active" : "map-star"}>
          *
        </span>
      ))}
    </div>
  );
}

function ProgressSummary({ profile }: { profile: JourneyProfile }) {
  return (
    <div className="map-summary">
      <div className="map-summary-head">
        <p className="map-eyebrow">SPM Learning Map</p>
        <h2 className="map-title">
          {profile.studentName} - {profile.form}
        </h2>
      </div>
      <p className="map-subtitle">Tap a level to open its material content.</p>
      <div className="map-metrics">
        <div className="map-metric">
          <span>Completed</span>
          <strong>
            {profile.completedLevels}/{profile.totalLevels}
          </strong>
        </div>
        <div className="map-metric">
          <span>Total XP</span>
          <strong>{profile.xp}</strong>
        </div>
        <div className="map-metric">
          <span>Current Topic</span>
          <strong>{profile.currentTopic}</strong>
        </div>
      </div>
    </div>
  );
}

function AIMapGuide({ message }: { message: string }) {
  return (
    <div className="map-ai-guide">
      <div className="map-ai-heading">
        <span className="map-ai-spark" aria-hidden="true" />
        <p>AI Assistant</p>
      </div>
      <p>{message}</p>
    </div>
  );
}

function MapPath() {
  return <div className="map-path" aria-hidden="true" />;
}

function LevelNode({
  node,
  index,
  active,
  onOpen,
}: {
  node: MapNode;
  index: number;
  active: boolean;
  onOpen: (node: MapNode) => void;
}) {
  const classes = [
    "map-node",
    node.status === "completed" ? "map-node-completed" : "",
    node.status === "current" ? "map-node-current" : "",
    node.status === "locked" ? "map-node-locked" : "",
    active ? "map-node-current" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const laneClass = index % 2 === 0 ? "lane-top" : "lane-bottom";
  const disabled = node.status === "locked";

  const icon =
    node.status === "completed" ? "ok" : node.status === "current" ? "go" : "lock";

  const circle = (
    <span className="map-node-icon" aria-hidden="true">
      {icon}
    </span>
  );

  return (
    <div className={`map-node-slot ${laneClass}`}>
      {disabled ? (
        <div className={classes} aria-disabled="true">
          <div className="map-node-circle">{circle}</div>
          <span className="map-node-topic">{node.topic}</span>
          <span className="map-node-stage">{node.stage}</span>
          <div className="map-node-reward">
            <span className="map-locked-chip">Locked</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={classes}
          onClick={() => onOpen(node)}
          title={`Open ${node.materialTitle}`}
        >
          <div className="map-node-circle">{circle}</div>
          <span className="map-node-topic">{node.topic}</span>
          <span className="map-node-stage">{node.stage}</span>
          <div className="map-node-reward">
            {node.status === "completed" && node.xp ? <XPBadge value={node.xp} /> : null}
            {node.status === "completed" ? <StarRating stars={node.stars} /> : null}
            {node.status === "current" && node.xp ? (
              <span className="map-current-chip">Start (+{node.xp} XP)</span>
            ) : null}
          </div>
        </button>
      )}
    </div>
  );
}

function LearningJourneyMap({
  nodes,
  selectedNodeId,
  onOpen,
}: {
  nodes: MapNode[];
  selectedNodeId: number;
  onOpen: (node: MapNode) => void;
}) {
  const currentNode = nodes.find((node) => node.status === "current");

  return (
    <div className="learning-map-wrap">
      <AIMapGuide message="Pilih node untuk terus buka content, latihan, atau assessment bagi setiap subtopic Bab 1." />
      <div className="learning-map">
        <MapPath />
        <div className="map-nodes-row">
          {nodes.map((node, index) => (
            <LevelNode
              key={node.id}
              node={node}
              index={index}
              active={node.id === selectedNodeId}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
      {currentNode ? (
        <p className="map-current-caption">
          Current Level: {currentNode.topic} {currentNode.stage}
        </p>
      ) : null}
    </div>
  );
}

function MaterialPanel({ node }: { node: MapNode }) {
  const subtopic = SUBTOPICS.find((item) => item.id === node.subtopicId);

  if (!subtopic) return null;

  return (
    <div className="material-task">
      <p className="material-task-label">{node.materialTitle}</p>
      <p>{node.materialPrompt}</p>
      <p>
        <strong>
          {subtopic.id} {subtopic.title}:
        </strong>{" "}
        {subtopic.meaning}
      </p>
      {subtopic.relation ? (
        <p>
          <strong>Hubungan Ubahan:</strong> {subtopic.relation}
        </p>
      ) : null}
      {subtopic.equation ? (
        <p>
          <strong>Bentuk Persamaan:</strong> {subtopic.equation}
        </p>
      ) : null}
      {subtopic.generalForm ? (
        <p>
          <strong>Bentuk Umum:</strong> {subtopic.generalForm}
        </p>
      ) : null}
      {subtopic.graph ? (
        <p>
          <strong>Graf:</strong> {subtopic.graph}
        </p>
      ) : null}
      {node.task ? (
        <p>
          <strong>Task:</strong> {node.task}
        </p>
      ) : null}
      {node.hint ? (
        <p className="material-answer">
          <strong>Hint:</strong> {node.hint}
        </p>
      ) : null}
    </div>
  );
}

export default function LearningJourneySection() {
  const profile: JourneyProfile = {
    studentName: "Amir",
    form: "Form 5",
    xp: 230,
    completedLevels: 4,
    totalLevels: MAP_NODES.length,
    currentTopic: "Bab 1: Ubahan (Subtopic 1.2)",
    aiMessage:
      "Pilih node untuk terus buka content, latihan, atau assessment bagi setiap subtopic Bab 1.",
  };

  const [selectedNodeId, setSelectedNodeId] = useState<number>(
    MAP_NODES.find((node) => node.status === "current")?.id ?? MAP_NODES[0].id
  );

  const selectedNode = useMemo(
    () => MAP_NODES.find((node) => node.id === selectedNodeId) ?? MAP_NODES[0],
    [selectedNodeId]
  );

  function handleOpen(node: MapNode) {
    setSelectedNodeId(node.id);
  }

  return (
    <section className="journey-section card page-enter page-enter-delay-2">
      <ProgressSummary profile={profile} />
      <LearningJourneyMap nodes={MAP_NODES} selectedNodeId={selectedNodeId} onOpen={handleOpen} />
      <MaterialPanel node={selectedNode} />
    </section>
  );
}
