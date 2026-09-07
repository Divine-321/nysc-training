# Course evaluation: 23-question survey — backend spec

> **Superseded.** This was the pre-ship draft handed to the backend
> developer. The deployed API differs from it in every field name (question
> types are `MULTIPLE_CHOICE` / `OPEN_TEXT` / `MIXED`, options carry real
> ids, submissions use `selected_option_id`, etc.) — the actual contract this
> frontend implements is documented as doc-comments on the relevant code:
> `EvaluationQuestion` and friends in `app/lib/staff-learning.ts`,
> `CourseEvaluationForm.tsx`. Keep this file only as a record of what the
> client originally asked for — the 23 questions themselves are unchanged.

Replaces the current single 1–5 star rating + comment
(`app/lib/staff-learning.ts` → `CourseEvaluation`) with a fixed 23-question
survey. This cannot be done frontend-only: the current `CourseEvaluation`
model only has room for one `rating` and one `feedback` field. This is a
request for the backend developer to add a questions/answers model.

Source: `NYSC LMS Evaluation Questions.pdf` (supplied by the client), four
sections, four answer types. Full question text and options are transcribed
below — this doc is the single source of truth for both sides to build
against.

## Answer types

| Type | Used by | Storage |
|---|---|---|
| `rating_scale` | Q1–6, 13–15 | Fixed 1–5, labels Strongly Disagree…Strongly Agree |
| `yes_no` | Q7–10 | Fixed Yes/No |
| `single_choice` | Q11, 12, 16, 17, 18, 22 | Custom options per question, one selected |
| `text` | Q19–21, 23 | Open free text |

`single_choice` on Q18 also needs `allow_other`: when the staff member picks
"Other", capture a free-text sub-answer alongside it.

**One open question before this is final**: the PDF lists Q13–15's options in
reverse order (Strongly Agree first) versus Q1–6 (Strongly Disagree first).
Assumed this is a formatting inconsistency in the source doc, not intentional
— the spec below renders all `rating_scale` questions the same
Strongly-Disagree→Strongly-Agree direction for a consistent UI, storing the
same 1–5 value regardless of display order. Flag if that's wrong.

Also: Q14 ("Was the live session... valuable") only applies to courses that
have a live session. **Decided:** the frontend hides Q14 for courses with no
live-session step — it already knows this from `liveSessions` in the course
player. The backend still stores Q14 like any other `rating_scale` question;
it's simply never answered for those courses, so treat it as optional
(`required: false`) rather than expecting every submission to include it.

## The 23 questions

### Section: Learning Content (rating_scale, Q1–6)

1. Were the course objectives clearly stated at the beginning of the training?
2. Was the course content relevant to my role and responsibilities in NYSC?
3. Were the learning materials clear, well organised and easy to understand?
4. The videos, documents and other resources supported my learning effectively.
5. The training improved my knowledge of the subject matter.
6. I can apply the knowledge gained from this course to my work.

### Section: LMS Experience and Usability (Q7–12)

7. Was the NYSC LMS easy to access and navigate? — `yes_no`
8. Was the registration and login process straightforward? — `yes_no`
9. Were the Course modules, lessons, and assessments easy to locate? — `yes_no`
10. Did the progress tracker help monitor my course completion status? — `yes_no`
11. Did the platform work effectively on my device? — `single_choice`
    - Yes, it worked perfectly. (`perfect`)
    - Mostly, with minor issues. (`minor_issues`)
    - Occasionally, with some significant problems. (`significant_problems`)
    - No, it didn't work at all. (`not_at_all`)
12. Did the portal perform reliably during my learning activities? — `single_choice`
    - Yes, it was very reliable. (`very_reliable`)
    - Generally reliable, with few interruptions. (`generally_reliable`)
    - Sometimes reliable, but often had issues. (`sometimes_reliable`)
    - No, it was very unreliable. (`unreliable`)

### Section: Facilitation and Support (rating_scale, Q13–15)

13. Were the instructions provided throughout the course clear?
14. Was the live session, where applicable, valuable to your learning experience?
15. Was technical support available and helpful when needed?

### Section: Overall Evaluation (Q16–23)

16. How would you rate your overall experience with the NYSC LMS? — `single_choice`
    - Excellent (`excellent`) / Very Good (`very_good`) / Good (`good`) / Fair (`fair`) / Poor (`poor`)
17. Which learning resource was most useful to you? — `single_choice`
    - Video lessons (`video_lessons`) / Reading materials/documents (`reading_materials`) /
      Interactive activities (`interactive_activities`) / Live sessions (`live_sessions`) /
      Assessments/quizzes (`assessments_quizzes`) / Downloadable resources (`downloadable_resources`)
18. Did you experience any challenge while using the portal? — `single_choice`, `allow_other: true`
    - No challenge (`no_challenge`) / Difficulty logging in (`difficulty_logging_in`) /
      Slow internet connection (`slow_internet`) / Difficulty locating courses or modules (`difficulty_locating`) /
      Video or audio problems (`video_audio_problems`) / Assessment-related issue (`assessment_issue`) /
      Other (`other`, free text)
19. What aspect of the NYSC LMS did you find most valuable? — `text`
20. What challenges did you encounter during the training? — `text`
21. What improvements would you recommend for the NYSC LMS or future courses? — `text`
22. Would you recommend the NYSC LMS training to other members of staff? — `single_choice`
    - Yes (`yes`) / No (`no`) / Maybe (`maybe`)
23. What additional courses or topics would you like to see on the NYSC LMS? — `text`

The `other` value is a fixed convention, not backend-specific: the frontend
shows a free-text box whenever a `single_choice` question has
`allow_other: true` and the selected option's value is exactly `"other"`.

## Proposed models

```python
class EvaluationQuestion(models.Model):
    class Type(models.TextChoices):
        RATING_SCALE = "rating_scale", "Rating scale (1-5)"
        YES_NO = "yes_no", "Yes / No"
        SINGLE_CHOICE = "single_choice", "Single choice"
        TEXT = "text", "Open text"

    order = models.PositiveIntegerField(unique=True)
    section = models.CharField(max_length=100)   # "Learning Content", etc.
    text = models.TextField()
    type = models.CharField(max_length=20, choices=Type.choices)
    required = models.BooleanField(default=True)
    allow_other = models.BooleanField(default=False)   # single_choice only
    is_active = models.BooleanField(default=True)      # soft-disable, keep history


class EvaluationQuestionOption(models.Model):
    question = models.ForeignKey(EvaluationQuestion, related_name="options",
                                  on_delete=models.CASCADE)
    order = models.PositiveIntegerField()
    label = models.CharField(max_length=200)
    value = models.CharField(max_length=50)   # "perfect", "yes", "5", etc.


class CourseEvaluation(models.Model):        # existing model
    enrollment = models.OneToOneField(Enrollment, on_delete=models.CASCADE,
                                       related_name="evaluation")
    submitted_at = models.DateTimeField(auto_now_add=True)
    # Legacy columns — keep nullable so evaluations submitted before this
    # change still read back. Nothing new writes to them.
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    feedback = models.TextField(null=True, blank=True)


class EvaluationAnswer(models.Model):
    evaluation = models.ForeignKey(CourseEvaluation, related_name="answers",
                                    on_delete=models.CASCADE)
    question = models.ForeignKey(EvaluationQuestion, on_delete=models.PROTECT)
    value = models.CharField(max_length=50, null=True, blank=True)  # option value / rating number
    text = models.TextField(null=True, blank=True)  # open text, or "other" free text

    class Meta:
        unique_together = ("evaluation", "question")
```

A migration should seed the 23 `EvaluationQuestion` + `EvaluationQuestionOption`
rows above in one data migration, so `order`/`section`/`text` live in the
database rather than hardcoded on the frontend — that's what makes them
editable later without a redeploy.

## Proposed endpoints

**`GET /api/training/evaluation-questions/`**
Active questions, ordered, with nested options. Staff-authenticated. Rarely
changes — safe to cache client-side for a long TTL.

```json
[
  {
    "id": 1, "order": 1, "section": "Learning Content",
    "text": "Were the course objectives clearly stated at the beginning of the training?",
    "type": "rating_scale", "required": true, "allow_other": false,
    "options": []
  },
  {
    "id": 11, "order": 11, "section": "LMS Experience and Usability",
    "text": "Did the platform work effectively on my device?",
    "type": "single_choice", "required": true, "allow_other": false,
    "options": [
      { "value": "perfect", "label": "Yes, it worked perfectly." },
      { "value": "minor_issues", "label": "Mostly, with minor issues." },
      { "value": "significant_problems", "label": "Occasionally, with some significant problems." },
      { "value": "not_at_all", "label": "No, it didn't work at all" }
    ]
  }
]
```

**`POST /api/training/evaluations/`** (body shape changes)

```json
{
  "enrollment": 123,
  "answers": [
    { "question": 1, "value": "4" },
    { "question": 7, "value": "yes" },
    { "question": 18, "value": "difficulty_logging_in" },
    { "question": 18, "value": "other", "text": "Could not reset password" },
    { "question": 19, "text": "The live sessions" }
  ]
}
```
Same validation as today (rejects if the enrollment isn't at 100%), plus:
reject if a `required` question has no answer.

**`GET /api/training/evaluations/`** and **`GET /api/training/evaluations/{id}/`**
Each evaluation returns its answers with the **full question nested**
(options included), so the admin table can render "minor_issues" as "Mostly,
with minor issues." without a second round trip to
`/evaluation-questions/` and a join by id:

```json
{
  "id": 55, "enrollment": 123, "staff_name": "...", "submitted_at": "...",
  "answers": [
    {
      "question": {
        "id": 1, "order": 1, "section": "Learning Content",
        "text": "Were the course objectives clearly stated at the beginning of the training?",
        "type": "rating_scale", "required": true, "allow_other": false, "options": []
      },
      "value": "4", "text": null
    },
    {
      "question": {
        "id": 11, "order": 11, "section": "LMS Experience and Usability",
        "text": "Did the platform work effectively on my device?",
        "type": "single_choice", "required": true, "allow_other": false,
        "options": [
          { "value": "perfect", "label": "Yes, it worked perfectly." },
          { "value": "minor_issues", "label": "Mostly, with minor issues." }
        ]
      },
      "value": "minor_issues", "text": null
    }
  ]
}
```

**Filtering** — add query params to the list endpoint so admin filtering
doesn't require downloading every evaluation, enrollment and programme and
joining client-side (which is what `app/admin/evaluations/page.tsx` does
today, purely because no filter exists to ask for less):
- `?programme=<id>` — evaluations for one Programme (one delivery/cohort run)
- `?course=<id>` — evaluations across every Programme of a Course

## Backward compatibility

Evaluations submitted before this ships keep their `rating`/`feedback` and
have no `answers`. The admin UI needs to show both kinds — a "legacy" row
with just a star rating, and a full row with 23 answers — rather than assume
every evaluation has the new shape.
