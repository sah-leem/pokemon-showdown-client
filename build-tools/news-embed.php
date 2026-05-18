<?php
$newsid = 1;
$news = '<div class="mmo-news">'
  . '<div class="mmo-news-header">'
  . '<img class="mmo-news-sprite" src="/fx/tentacruel.gif" width="96" height="96" alt="">'
  . '<div class="mmo-news-header-text">'
  . '<p class="mmo-news-title">MMO Showdown</p>'
  . '<p class="mmo-news-subtitle">PokeMMO competitive sim</p>'
  . '</div>'
  . '</div>'
  . '<p class="mmo-news-body">Build your team, practice battles, blame hax.</p>'
  . '<div class="mmo-news-links">'
  . '<a href="https://forums.pokemmo.com" target="_blank" rel="noopener">Forums</a>'
  . '<a href="https://discord.gg/tWXGCtud4m" target="_blank" rel="noopener">Discord</a>'
  . '<a href="https://calc.mmoshowdown.cc" target="_blank" rel="noopener">Damage Calc</a>'
  . '<a href="https://mmoshowdown.cc/rules" target="_blank" rel="noopener">Server Rules</a>'
  . '</div>'
  . '</div>';
echo json_encode([$newsid, $news]);
