using System.Text.RegularExpressions;

namespace IQADMS.API.Services;

public static class DocumentFolderClassifier
{
    private static readonly (string[] Keywords, string FolderPrefix)[] Rules =
    {
        (new[] { "operational plan", "op plan", "operation plan" }, "Operational Plans"),
        (new[] { "accomplishment report", "accomplishment", "accom report" }, "Accomplishment Reports"),
        (new[] { "minutes of meeting", "minutes of the meeting", "minutes", "mom" }, "Minutes of Meeting"),
        (new[] { "strategic plan" }, "Strategic Plans"),
        (new[] { "syllabus", "syllabi" }, "Syllabi"),
        (new[] { "curriculum" }, "Curriculum"),
        (new[] { "self survey", "self-survey" }, "Self Survey"),
        (new[] { "faculty manual" }, "Faculty Manual"),
        (new[] { "organizational chart", "org chart" }, "Organizational Charts")
    };

    public static string Classify(
        string fileName,
        string? requiredDocumentTitle,
        string? departmentCode,
        string? departmentName)
    {
        var stem = Path.GetFileNameWithoutExtension(fileName);
        var haystack = Normalize($"{stem} {requiredDocumentTitle}");

        var year = ExtractYear(haystack) ?? DateTime.UtcNow.Year.ToString();

        foreach (var (keywords, prefix) in Rules)
        {
            if (keywords.Any(k => haystack.Contains(Normalize(k))))
                return $"{prefix} {year}";
        }

        if (!string.IsNullOrWhiteSpace(requiredDocumentTitle))
        {
            var docHay = Normalize(requiredDocumentTitle);
            foreach (var (keywords, prefix) in Rules)
            {
                if (keywords.Any(k => docHay.Contains(Normalize(k))))
                    return $"{prefix} {year}";
            }

            return $"{SanitizeFolderSegment(requiredDocumentTitle)} {year}";
        }

        var dept = !string.IsNullOrWhiteSpace(departmentCode)
            ? departmentCode!.Trim()
            : SanitizeFolderSegment(departmentName ?? "General");

        return $"{dept}/{SanitizeFolderSegment(stem)}";
    }

    public static Guid? MatchRequiredDocumentId(string fileName, IEnumerable<(Guid Id, string Title)> documents)
    {
        var haystack = Normalize(Path.GetFileNameWithoutExtension(fileName));
        foreach (var doc in documents)
        {
            var title = Normalize(doc.Title);
            if (haystack.Contains(title) || title.Split(' ').Count(w => w.Length > 3 && haystack.Contains(w)) >= 2)
                return doc.Id;
        }

        foreach (var (keywords, _) in Rules)
        {
            if (!keywords.Any(k => haystack.Contains(Normalize(k)))) continue;
            foreach (var doc in documents)
            {
                if (keywords.Any(k => Normalize(doc.Title).Contains(Normalize(k))))
                    return doc.Id;
            }
        }

        return null;
    }

    private static string? ExtractYear(string haystack)
    {
        var m = Regex.Match(haystack, @"\b(20\d{2})\b");
        return m.Success ? m.Groups[1].Value : null;
    }

    private static string Normalize(string? input) =>
        (input ?? string.Empty).ToLowerInvariant().Replace('_', ' ').Replace('-', ' ');

    private static string SanitizeFolderSegment(string input)
    {
        var cleaned = Regex.Replace(input.Trim(), @"[^\w\s-]", "");
        cleaned = Regex.Replace(cleaned, @"\s+", " ").Trim();
        return string.IsNullOrEmpty(cleaned) ? "Uncategorized" : cleaned;
    }
}
