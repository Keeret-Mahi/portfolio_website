# GooseCalendar

## Turning course outlines into calendars

gooseCalendar is a web app that turns course outlines into exportable calendar events.

During the first week of classes each semester, I noticed a lot of students, myself included, manually opening each course outline and copying important dates into Google Calendar one by one. Others scrambled to jot down dates as professors mentioned them in class.

Since course outlines tend to follow a fairly standardized format, I figured there had to be a faster way to do this. That's how gooseCalendar came to be.

Students upload the course outline their instructor provides, choose the sections they're actually enrolled in, review the extracted events, and export everything to Google Calendar or an .ics file.

gooseCalendar was originally built and optimized for UWaterloo course outlines, but now works with any PDF or course outline.

The example below shows the transformation using a STAT 231 outline. The source table compresses seven dated assessments into four rows: three R assignments, two tutorial quizzes, and two term tests. gooseCalendar separates those grouped dates into individual events, applies the appropriate assignment or assessment label, and carries forward the date plus location or submission method so every item can be reviewed before export.

[IMAGE: ./assets/images/goose-calendar/STAT231 Outline.png | 01 · source outline | A STAT 231 assessment table within the course outline lists assessment dates, weights, locations, submission methods, and other important information.]
[IMAGE: ./assets/images/goose-calendar/STAT231 gooseCalendar.png | 02 · gooseCalendar output | The grouped dates become seven individual, editable events with their event type, date, and location or submission method preserved.]

## The gap in existing tools

Quest (UWaterloo's platform) can help students add lectures, tutorials, and labs, but it does not capture assignment deadlines, quizzes, midterms, office hours, or course-specific notes. Some courses also do not rely heavily on Learn, so important dates often live directly inside the course outline.

## Building the parsing pipeline

GooseCalendar was built with React, TypeScript, Vite, Tailwind CSS, OpenAI, Firebase/Firestore-style caching, custom calendar export logic, Google Identity Services OAuth, and the Google Calendar API.

**Frontend:** React 18, TypeScript, Vite

**Routing:** React Router 7

**Styling:** Tailwind CSS 4, custom CSS theme files, Lexend, Inter, and Noto Sans fonts

**UI:** Radix UI primitives, lucide-react icons, selected MUI packages

**Calendar logic:** Custom TypeScript calendar/export logic, date-fns

**Exports:** .ics generation and Google Calendar API export

**Google Auth/API:** Google Identity Services OAuth and Google Calendar API

**AI processing:** OpenAI API through a server-side extraction handler

**Backend/API:** Vercel-style serverless function in api/extract-outline-events.ts, shared with Vite dev middleware

**Caching/Data:** Firebase Admin / Firestore-style AI extraction cache

**File parsing:** Pure TypeScript HTML, text, and PDF text extraction logic

**Build/Deploy:** Vite production build, npm

## How gooseCalendar parses outlines

The first version of gooseCalendar was built around UWaterloo's HTML outlines.

Most UWaterloo outlines share a consistent HTML structure, with content organized under tags like article.outline-content > h2.header. The deterministic parser looks for known sections, such as class_schedule, then locates schedule tables and other relevant information within them.

From these structured sections, gooseCalendar extracts course metadata, section numbers, instructor details, meeting days, date ranges, times, locations, asynchronous sections, and recurring lecture, tutorial, and lab events.

[PIPELINE: Read the outline -> Parse reliable structure -> Use AI for the gaps -> Cache, review, and export]

Keeping this layer deterministic matters: schedules shouldn't depend on AI when the outline already provides a reliable structure to parse. That said, pure deterministic parsing only gets you so far. It tends to break down when information is buried in paragraphs, bullet points, or complex tables.

This is where an AI-assisted hybrid approach comes in. gooseCalendar first uses deterministic TypeScript-based HTML parsing to scrape everything it reliably can, then combines whatever is left unparsed and sends it to the OpenAI API to identify any remaining important dates.

To keep this efficient, gooseCalendar stores each completed AI extraction in a Firebase Firestore cache keyed by a hash of the outline. When the same file is uploaded again, the app can reuse the stored structured events instead of calling OpenAI a second time, reducing latency and API cost.

```json
{
  "cacheVersion": "v2",
  "outlineHash": "a4c9...e21b",
  "outlineName": "sample-course-outline.pdf",
  "sourceFormat": "pdf",
  "courseCode": "CS 101",
  "courseName": "Introduction to Computing",
  "termYear": 2026,
  "eventCount": 8,
  "extractionMode": "nonMeeting",
  "hitCount": 3,
  "model": "sample-extraction-model",
  "extraction": {
    "events": [
      {
        "confidence": "high",
        "eventType": "Assignment",
        "label": "Assignment 1 Due",
        "location": "Online",
        "sourceKind": "table",
        "sourceSectionTitle": "Assessments",
        "sourceSnippet": "Assignment 1 due September 25 at 11:59 PM.",
        "timing": {
          "allDay": true,
          "date": "2026-09-25",
          "kind": "single"
        },
        "weight": "10%"
      }
    ],
    "warnings": []
  },
  "createdAt": "2026-09-01T14:30:00Z",
  "updatedAt": "2026-09-01T14:30:00Z"
}
```

Adding OpenAI's API not only improved coverage across outlines but also expanded what gooseCalendar can accept as input: users can now upload PDFs, HTML files, plain text files, and more.

## Takeaways

Building gooseCalendar showed me how real projects usually come out of solving narrow but frequent problems. It also made me think about when AI is the right tool in a pipeline and when deterministic logic should do the work instead.
