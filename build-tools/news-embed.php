<?php
// reads news-data.json and renders entries for build-time bake.
// runtime JS in head-custom.html will override with fresh data.
$jsonPath = __DIR__ . '/../play.pokemonshowdown.com/news-data.json';
$entries = [];
if (file_exists($jsonPath)) {
    $data = json_decode(file_get_contents($jsonPath), true);
    if (is_array($data)) $entries = $data;
}

// newsid = latest entry id (triggers "unread" indicator when new entry added)
$newsid = count($entries) > 0 ? $entries[0]['id'] : 0;

// render entries
$items = '';
$max = min(count($entries), 5);
for ($i = 0; $i < $max; $i++) {
    $e = $entries[$i];
    $title = htmlspecialchars($e['title'] ?? '', ENT_QUOTES);
    $body = htmlspecialchars($e['body'] ?? '', ENT_QUOTES);
    $date = htmlspecialchars($e['date'] ?? '', ENT_QUOTES);
    $sep = $i < $max - 1 ? ' mmo-news-entry--border' : '';
    $items .= '<div class="mmo-news-entry' . $sep . '">'
        . '<span class="mmo-news-date">' . $date . '</span>'
        . '<strong class="mmo-news-entry-title">' . $title . '</strong>'
        . '<p class="mmo-news-entry-body">' . $body . '</p>'
        . '</div>';
}

if ($items === '') {
    $items = '<p class="mmo-news-entry-body" style="text-align:center;">No news yet.</p>';
}

$news = '<div id="mmo-news-content" class="mmo-news">'
    . '<div class="mmo-news-header">'
    . '<div class="mmo-news-header-text">'
    . '<p class="mmo-news-title">Latest News</p>'
    . '<p class="mmo-news-subtitle">PokeMMO Showdown</p>'
    . '</div>'
    . '</div>'
    . '<div class="mmo-news-entries">' . $items . '</div>'
    . '</div>';

echo json_encode([$newsid, $news]);
