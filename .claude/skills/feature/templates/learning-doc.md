# Learning doc template

> Used by `/feature export`. Section headings and all prose are written in **Croatian**. The instructions in this template are in English. Code, paths and identifiers stay in English. Replace every `<...>` and delete these instruction lines.

---

# <Feature name>: što smo napravili, zašto i kako to objasniti na razgovoru

> Projekt: Stockroom · PR [#<n>](<PR URL>) · spec: `context/features/<name>-spec.md` · datum: <YYYY-MM-DD>
> Privatne bilješke za učenje i pripremu za razgovor za posao. Pisano kao da o ovoj temi ne znaš ništa.

## 1. Ukratko (30 sekundi)

<3–5 sentences: what was added, what problem it solves, the end result. Something you could say out loud in 30 seconds.>

## 2. Osnovni pojmovi

<Table `| Pojam | Što znači |` with every term a beginner needs for this feature. Plain language, one line each.>

## 3. Problem koji rješavamo

<Why this feature exists. What goes wrong without it. Concrete examples from this project.>

## 4. Datoteke: što je dodano ili promijenjeno i zašto

<Every file from `git diff --stat main...HEAD`, grouped. One sentence of "why" per file. Generated files as one line.>

**Dodano**

| Datoteka | Zašto |
| -------- | ----- |
| `<path>` | <why> |

**Izmijenjeno**

| Datoteka | Što se promijenilo i zašto |
| -------- | -------------------------- |
| `<path>` | <what and why>             |

**Obrisano** <only if any>

## 5. Kako radi: ključni dijelovi koda

<For each important part: a short intro, the snippet (not the whole file), and an explanation of the important lines below it. Order it the way data or control flows through the feature. Add a small text diagram if it helps.>

### 5.1 <Part name>

```<lang>
<snippet>
```

<Explanation: what it does, why it's written this way, what would break without it.>

## 6. Kako smo dokazali da radi

<Tests added (what each proves), manual checks, CI runs with links (green, deliberate red, green). Mention any test that was made to fail on purpose to prove it works.>

## 7. Odluke i kompromisi

| Odluka     | Alternativa   | Zašto ovako |
| ---------- | ------------- | ----------- |
| <decision> | <alternative> | <reason>    |

<Mention what is deliberately out of scope and which later feature handles it. Mark any unverified assumptions.>

## 8. Zašto je ovo važno za mid poziciju

<Which job-ad requirements this covers. The junior vs mid difference for this topic. What an employer sees on GitHub without asking.>

## 9. Kako to obraniti na razgovoru za posao

<8–12 questions. Each: the question in bold, then a short first-person answer as a quote, grounded in what this feature actually did.>

**„<question>“**

> <answer>

**Česta zamka:** <one thing that sounds right but is wrong, and the correct version.>

## 10. Što dolazi sljedeće

<How later features build on this one.>

## 11. Brzi podsjetnik (za dan prije razgovora)

<6–10 bullet points, the minimum to remember.>
