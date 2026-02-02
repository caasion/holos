import type { Track, ISODate, Templates } from "src/plugin/types";

export const sampleTemplateData: Templates = {
  "2026-02-01": {
    id: "template-feb-2026",
    name: "February 2026 Template",
    effectiveFrom: "2026-02-01",
    tracks: {
      "track-health": {
        id: "track-health",
        order: 0,
        label: "Health & Wellness",
        color: "#4CAF50",
        timeCommitment: 2,
        journalHeader: "## 🏃 Health & Wellness",
        habits: [
          {
            id: "habit-morning-workout",
            label: "Morning Workout",
            rrule: "FREQ=DAILY;BYDAY=MO,WE,FR"
          },
          {
            id: "habit-meditation",
            label: "Meditation",
            rrule: "FREQ=DAILY"
          }
        ],
        activeProject: {
          id: "project-fitness-2026",
          label: "2026 Fitness Goals",
          active: [
            {
              startDate: "2026-01-01",
              endDate: "2026-12-31",
              rrule: "FREQ=DAILY"
            }
          ],
          data: [
            {
              raw: "- [ ] 30 min cardio",
              text: "30 min cardio",
              children: [],
              isTask: true,
              taskStatus: " ",
              startTime: {
                hours: 6,
                minutes: 30
              },
              duration: 30,
              timeUnit: "min"
            },
            {
              raw: "- [ ] Track meals and water intake",
              text: "Track meals and water intake",
              children: [],
              isTask: true,
              taskStatus: " "
            }
          ],
          habits: []
        }
      },
      "track-work": {
        id: "track-work",
        order: 1,
        label: "Work Projects",
        color: "#2196F3",
        timeCommitment: 6,
        journalHeader: "## 💼 Work Projects",
        habits: [
          {
            id: "habit-standup",
            label: "Daily Standup",
            rrule: "FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"
          },
          {
            id: "habit-review-calendar",
            label: "Review Calendar",
            rrule: "FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"
          }
        ],
        activeProject: {
          id: "project-plugin-dev",
          label: "Obsidian Plugin Development",
          active: [
            {
              startDate: "2026-01-15",
              endDate: "2026-03-31"
            }
          ],
          data: [
            {
              raw: "- [ ] Review PRs and issues",
              text: "Review PRs and issues",
              children: [],
              isTask: true,
              taskStatus: " ",
              startTime: {
                hours: 9,
                minutes: 0
              },
              duration: 1,
              timeUnit: "hr"
            },
            {
              raw: "- [ ] Implement new features",
              text: "Implement new features",
              children: [
                "Add calendar integration",
                "Improve template system"
              ],
              isTask: true,
              taskStatus: " ",
              duration: 3,
              timeUnit: "hr"
            },
            {
              raw: "- [ ] Write documentation",
              text: "Write documentation",
              children: [],
              isTask: true,
              taskStatus: " ",
              duration: 1,
              timeUnit: "hr"
            }
          ],
          habits: []
        }
      },
      "track-learning": {
        id: "track-learning",
        order: 2,
        label: "Learning & Development",
        color: "#FF9800",
        timeCommitment: 2,
        journalHeader: "## 📚 Learning & Development",
        habits: [
          {
            id: "habit-read",
            label: "Read for 30 minutes",
            rrule: "FREQ=DAILY"
          },
          {
            id: "habit-coding-challenge",
            label: "Coding Challenge",
            rrule: "FREQ=DAILY;BYDAY=MO,WE,FR"
          }
        ],
        activeProject: {
          id: "project-ts-mastery",
          label: "TypeScript Mastery",
          active: [
            {
              startDate: "2026-02-01",
              endDate: "2026-04-30"
            }
          ],
          data: [
            {
              raw: "- [ ] Complete TypeScript course module",
              text: "Complete TypeScript course module",
              children: [],
              isTask: true,
              taskStatus: " ",
              duration: 1,
              timeUnit: "hr",
              progress: 0
            },
            {
              raw: "- [ ] Practice advanced patterns",
              text: "Practice advanced patterns",
              children: [
                "Generics",
                "Conditional types",
                "Mapped types"
              ],
              isTask: true,
              taskStatus: " ",
              duration: 1,
              timeUnit: "hr"
            }
          ],
          habits: []
        }
      },
      "track-personal": {
        id: "track-personal",
        order: 3,
        label: "Personal Life",
        color: "#E91E63",
        timeCommitment: 2,
        journalHeader: "## 🏠 Personal Life",
        habits: [
          {
            id: "habit-gratitude",
            label: "Gratitude journaling",
            rrule: "FREQ=DAILY"
          },
          {
            id: "habit-family-time",
            label: "Quality family time",
            rrule: "FREQ=DAILY"
          }
        ],
        activeProject: {
          id: "project-home-improvement",
          label: "Home Organization",
          active: [
            {
              startDate: "2026-02-01",
              endDate: "2026-02-28"
            }
          ],
          data: [
            {
              raw: "- [ ] Organize home office",
              text: "Organize home office",
              children: [],
              isTask: true,
              taskStatus: " ",
              duration: 2,
              timeUnit: "hr"
            },
            {
              raw: "- [ ] Plan weekend activities",
              text: "Plan weekend activities",
              children: [],
              isTask: true,
              taskStatus: " "
            }
          ],
          habits: []
        }
      },
      "track-creative": {
        id: "track-creative",
        order: 4,
        label: "Creative Projects",
        color: "#9C27B0",
        timeCommitment: 1.5,
        journalHeader: "## 🎨 Creative Projects",
        habits: [
          {
            id: "habit-sketch",
            label: "Daily sketch",
            rrule: "FREQ=DAILY;BYDAY=SA,SU"
          }
        ],
        activeProject: {
          id: "project-blog",
          label: "Tech Blog",
          active: [
            {
              startDate: "2026-01-01",
              endDate: "2026-12-31"
            }
          ],
          data: [
            {
              raw: "- [ ] Draft blog post",
              text: "Draft blog post",
              children: [],
              isTask: true,
              taskStatus: " ",
              duration: 1,
              timeUnit: "hr"
            },
            {
              raw: "- [ ] Edit and publish content",
              text: "Edit and publish content",
              children: [],
              isTask: true,
              taskStatus: " ",
              duration: 30,
              timeUnit: "min"
            }
          ],
          habits: []
        }
      }
    }
  }
};

// Helper to get tracks as an array
export const sampleTracks: Track[] = Object.values(sampleTemplateData["2026-02-01"].tracks);

// Helper to get a single track
export const getSampleTrack = (trackId: string): Track | undefined => {
  return sampleTemplateData["2026-02-01"].tracks[trackId];
};

// Quick access to individual tracks
export const healthTrack = sampleTemplateData["2026-02-01"].tracks["track-health"];
export const workTrack = sampleTemplateData["2026-02-01"].tracks["track-work"];
export const learningTrack = sampleTemplateData["2026-02-01"].tracks["track-learning"];
export const personalTrack = sampleTemplateData["2026-02-01"].tracks["track-personal"];
export const creativeTrack = sampleTemplateData["2026-02-01"].tracks["track-creative"];
