using System.Text.RegularExpressions;

namespace IQADMS.API.Services;

public static partial class MentionParser
{
    [GeneratedRegex(@"@([a-zA-Z0-9._-]+)", RegexOptions.Compiled)]
    private static partial Regex MentionRegex();

    private static readonly char[] TrailingPunctuation = ['.', ',', ';', ':', '!', '?', ')', ']', '}'];

    public static HashSet<string> ExtractTokens(string? title, string? description)
    {
        var tokens = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var source in new[] { title, description })
        {
            if (string.IsNullOrWhiteSpace(source)) continue;
            foreach (Match match in MentionRegex().Matches(source))
            {
                var token = NormalizeToken(match.Groups[1].Value);
                if (!string.IsNullOrEmpty(token))
                    tokens.Add(token);
            }
        }
        return tokens;
    }

    public static bool ContainsEveryone(IEnumerable<string> tokens) =>
        tokens.Any(t => t.Equals("everyone", StringComparison.OrdinalIgnoreCase));

    public static IEnumerable<string> SpecificMentionTokens(IEnumerable<string> tokens) =>
        tokens.Where(t => !t.Equals("everyone", StringComparison.OrdinalIgnoreCase));

    private static string NormalizeToken(string raw)
    {
        var token = raw.Trim().TrimEnd(TrailingPunctuation).Trim();
        return token;
    }
}
