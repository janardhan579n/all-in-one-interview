package com.learningplatform.search;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService search;

    public SearchController(SearchService search) {
        this.search = search;
    }

    @GetMapping
    public List<Map<String, Object>> search(@RequestParam("q") String query,
                                            @RequestParam(defaultValue = "20") int limit) {
        return search.search(query, Math.min(limit, 50));
    }
}
