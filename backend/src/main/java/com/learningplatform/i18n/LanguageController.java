package com.learningplatform.i18n;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.learningplatform.common.NotFoundException;
import com.learningplatform.content.ContentStore;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Languages and UI strings.
 *
 * <p>The coverage figure is served alongside each language deliberately. A language button that
 * silently shows English is a lie of omission; one that says "42 of 103 translated" lets a learner
 * decide whether to switch, and tells a contributor exactly where the work is.
 */
@RestController
@RequestMapping("/api/i18n")
public class LanguageController {

    private final ContentStore content;

    public LanguageController(ContentStore content) {
        this.content = content;
    }

    @GetMapping("/languages")
    public List<ObjectNode> languages() {
        Map<String, Integer> coverage = content.translationCoverage();
        int total = content.totalItems();

        List<ObjectNode> result = new ArrayList<>();
        for (JsonNode language : content.languages()) {
            if (!(language instanceof ObjectNode node)) {
                continue;
            }
            ObjectNode entry = node.deepCopy();
            String code = node.path("code").asText();
            boolean isSource = node.path("default").asBoolean(false);

            int translated = isSource ? total : coverage.getOrDefault(code, 0);
            entry.put("translatedDocuments", translated);
            entry.put("totalDocuments", total);
            entry.put("coveragePercent", total == 0 ? 0 : Math.round(100f * translated / total));
            entry.put("hasUiStrings", content.uiStrings(code) != null);
            result.add(entry);
        }
        return result;
    }

    /** UI strings for one language. The client falls back to English for any missing key. */
    @GetMapping("/strings/{language}")
    public ObjectNode strings(@PathVariable String language) {
        ObjectNode strings = content.uiStrings(language);
        if (strings == null) {
            throw new NotFoundException("No UI strings for language '" + language + "'");
        }
        return strings;
    }
}
