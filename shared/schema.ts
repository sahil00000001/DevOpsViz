import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Azure DevOps Tables
export const repositories = pgTable("repositories", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  projectId: varchar("project_id").notNull(),
  projectName: text("project_name").notNull(),
  organization: text("organization").notNull(),
  defaultBranch: text("default_branch"),
  size: integer("size"),
  url: text("url"),
  webUrl: text("web_url"),
  createdDate: timestamp("created_date"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const commits = pgTable("commits", {
  id: varchar("id").primaryKey(),
  commitId: varchar("commit_id").notNull(),
  repositoryId: varchar("repository_id").notNull(),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email").notNull(),
  authorDate: timestamp("author_date").notNull(),
  committerName: text("committer_name").notNull(),
  committerEmail: text("committer_email").notNull(),
  committerDate: timestamp("committer_date").notNull(),
  comment: text("comment").notNull(),
  commentTruncated: boolean("comment_truncated").default(false),
  changeCounts: jsonb("change_counts").$type<{
    Add: number;
    Edit: number;
    Delete: number;
  }>(),
  url: text("url"),
  remoteUrl: text("remote_url"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const workItems = pgTable("work_items", {
  id: integer("id").primaryKey(),
  rev: integer("rev"),
  projectName: text("project_name").notNull(),
  areaPath: text("area_path"),
  iterationPath: text("iteration_path"),
  workItemType: text("work_item_type").notNull(),
  state: text("state").notNull(),
  reason: text("reason"),
  title: text("title").notNull(),
  assignedToName: text("assigned_to_name"),
  assignedToEmail: text("assigned_to_email"),
  assignedToImageUrl: text("assigned_to_image_url"),
  createdDate: timestamp("created_date").notNull(),
  createdByName: text("created_by_name"),
  createdByEmail: text("created_by_email"),
  changedDate: timestamp("changed_date"),
  description: text("description"),
  acceptanceCriteria: text("acceptance_criteria"),
  storyPoints: integer("story_points"),
  priority: integer("priority"),
  severity: text("severity"),
  tags: text("tags").array(),
  url: text("url"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const pullRequests = pgTable("pull_requests", {
  id: integer("id").primaryKey(),
  repositoryId: varchar("repository_id").notNull(),
  pullRequestId: integer("pull_request_id").notNull(),
  codeReviewId: integer("code_review_id"),
  status: text("status").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  sourceRefName: text("source_ref_name").notNull(),
  targetRefName: text("target_ref_name").notNull(),
  mergeStatus: text("merge_status"),
  isDraft: boolean("is_draft").default(false),
  createdByName: text("created_by_name").notNull(),
  createdByEmail: text("created_by_email"),
  createdByImageUrl: text("created_by_image_url"),
  creationDate: timestamp("creation_date").notNull(),
  reviewers: jsonb("reviewers").$type<Array<{
    displayName: string;
    email?: string;
    imageUrl?: string;
    vote: 'approved' | 'approved_with_suggestions' | 'no_vote' | 'waiting' | 'rejected';
    isRequired?: boolean;
  }>>(),
  workItemIds: integer("work_item_ids").array(),
  url: text("url"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  uniqueName: text("unique_name"),
  imageUrl: text("image_url"),
  projectName: text("project_name").notNull(),
  organization: text("organization").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const sprints = pgTable("sprints", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  projectName: text("project_name").notNull(),
  organization: text("organization").notNull(),
  startDate: timestamp("start_date"),
  finishDate: timestamp("finish_date"),
  state: text("state"), // future, current, past
  attributes: jsonb("attributes"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRepositorySchema = createInsertSchema(repositories);
export const insertCommitSchema = createInsertSchema(commits);
export const insertWorkItemSchema = createInsertSchema(workItems);
export const insertPullRequestSchema = createInsertSchema(pullRequests);
export const insertTeamMemberSchema = createInsertSchema(teamMembers);
export const insertSprintSchema = createInsertSchema(sprints);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositories.$inferSelect;

export type InsertCommit = z.infer<typeof insertCommitSchema>;
export type Commit = typeof commits.$inferSelect;

export type InsertWorkItem = z.infer<typeof insertWorkItemSchema>;
export type WorkItem = typeof workItems.$inferSelect;

export type InsertPullRequest = z.infer<typeof insertPullRequestSchema>;
export type PullRequest = typeof pullRequests.$inferSelect;

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertSprint = z.infer<typeof insertSprintSchema>;
export type Sprint = typeof sprints.$inferSelect;
