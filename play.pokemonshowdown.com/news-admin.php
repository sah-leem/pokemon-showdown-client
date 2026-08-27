<?php
// news admin - manages news-data.json
// protected by nginx basic auth
$jsonPath = __DIR__ . '/news-data.json';

function readNews($path) {
    if (!file_exists($path)) return [];
    $data = json_decode(file_get_contents($path), true);
    return is_array($data) ? $data : [];
}

function writeNews($path, $entries) {
    file_put_contents($path, json_encode($entries, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function esc($s) {
    return htmlspecialchars($s ?? '', ENT_QUOTES, 'UTF-8');
}

$entries = readNews($jsonPath);

// handle POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add') {
        $entry = [
            'id' => time(),
            'title' => trim($_POST['title'] ?? ''),
            'body' => trim($_POST['body'] ?? ''),
            'date' => $_POST['date'] ?? date('Y-m-d')
        ];
        if ($entry['title'] !== '') {
            array_unshift($entries, $entry);
            writeNews($jsonPath, $entries);
        }
        header('Location: ' . $_SERVER['PHP_SELF'] . '?msg=added');
        exit;
    }

    if ($action === 'edit') {
        $id = intval($_POST['id'] ?? 0);
        foreach ($entries as &$e) {
            if (($e['id'] ?? 0) === $id) {
                $e['title'] = trim($_POST['title'] ?? $e['title']);
                $e['body'] = trim($_POST['body'] ?? $e['body']);
                $e['date'] = $_POST['date'] ?? $e['date'];
                break;
            }
        }
        unset($e);
        writeNews($jsonPath, $entries);
        header('Location: ' . $_SERVER['PHP_SELF'] . '?msg=updated');
        exit;
    }

    if ($action === 'delete') {
        $id = intval($_POST['id'] ?? 0);
        $entries = array_values(array_filter($entries, function($e) use ($id) {
            return ($e['id'] ?? 0) !== $id;
        }));
        writeNews($jsonPath, $entries);
        header('Location: ' . $_SERVER['PHP_SELF'] . '?msg=deleted');
        exit;
    }

    if ($action === 'reorder') {
        $ids = json_decode($_POST['order'] ?? '[]', true);
        if (is_array($ids) && count($ids) > 0) {
            $byId = [];
            foreach ($entries as $e) $byId[$e['id']] = $e;
            $reordered = [];
            foreach ($ids as $id) {
                if (isset($byId[$id])) $reordered[] = $byId[$id];
            }
            // append any entries not in the order list
            foreach ($entries as $e) {
                if (!in_array($e['id'], $ids)) $reordered[] = $e;
            }
            $entries = $reordered;
            writeNews($jsonPath, $entries);
        }
        header('Location: ' . $_SERVER['PHP_SELF'] . '?msg=reordered');
        exit;
    }
}

$msg = $_GET['msg'] ?? '';
$editId = isset($_GET['edit']) ? intval($_GET['edit']) : null;
$editEntry = null;
if ($editId !== null) {
    foreach ($entries as $e) {
        if (($e['id'] ?? 0) === $editId) {
            $editEntry = $e;
            break;
        }
    }
}

// re-read after any changes
$entries = readNews($jsonPath);
?><!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>News Admin - MMO Showdown</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  min-height: 100vh;
  padding: 20px;
}
a { color: #7ad4e8; }
.container { max-width: 700px; margin: 0 auto; }
h1 {
  font-size: 22px;
  color: #7ad4e8;
  margin-bottom: 6px;
}
.subtitle {
  font-size: 12px;
  color: #6a8a94;
  margin-bottom: 20px;
}
.toast {
  background: #2a4a3a;
  color: #8eeaaa;
  padding: 8px 14px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 16px;
  border: 1px solid #3a6a4a;
}

/* form */
.form-card {
  background: #16213e;
  border: 1px solid #2a3a5e;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}
.form-card h2 {
  font-size: 14px;
  color: #7ad4e8;
  margin-bottom: 12px;
}
.field { margin-bottom: 10px; }
.field label {
  display: block;
  font-size: 11px;
  color: #8aa4ac;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.field input, .field textarea {
  width: 100%;
  padding: 8px 10px;
  background: #0f1a30;
  border: 1px solid #2a3a5e;
  border-radius: 4px;
  color: #e0e0e0;
  font-family: inherit;
  font-size: 13px;
}
.field input:focus, .field textarea:focus {
  outline: none;
  border-color: #7ad4e8;
}
.field textarea { resize: vertical; min-height: 60px; }
.field .hint {
  font-size: 10px;
  color: #5a7a84;
  margin-top: 3px;
}
.btn {
  display: inline-block;
  padding: 7px 16px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
}
.btn-primary {
  background: #7ad4e8;
  color: #0f1a30;
  font-weight: 600;
}
.btn-primary:hover { background: #5ec4d8; }
.btn-danger {
  background: #e85a5a;
  color: #fff;
}
.btn-danger:hover { background: #d04040; }
.btn-ghost {
  background: transparent;
  color: #7ad4e8;
  border: 1px solid #2a3a5e;
}
.btn-ghost:hover { border-color: #7ad4e8; }
.btn-row { display: flex; gap: 8px; align-items: center; }

/* entries list */
.entries-header {
  font-size: 14px;
  color: #7ad4e8;
  margin-bottom: 12px;
}
.entry-card {
  background: #16213e;
  border: 1px solid #2a3a5e;
  border-radius: 6px;
  padding: 14px;
  margin-bottom: 10px;
}
.entry-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.entry-date {
  font-size: 10px;
  color: #6a8a94;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.entry-id {
  font-size: 9px;
  color: #3a5a6e;
  font-family: monospace;
}
.entry-title {
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 4px;
}
.entry-body {
  font-size: 11px;
  color: #a0b4bc;
  line-height: 1.5;
  margin-bottom: 10px;
  white-space: pre-wrap;
  word-break: break-word;
}
.entry-actions {
  display: flex;
  gap: 6px;
}
.entry-actions .btn { font-size: 11px; padding: 4px 10px; }

.empty {
  text-align: center;
  color: #5a7a84;
  padding: 30px;
  font-size: 13px;
}
.back-link {
  display: inline-block;
  margin-bottom: 16px;
  font-size: 12px;
}
</style>
</head>
<body>
<div class="container">

<h1>News Admin</h1>
<p class="subtitle">manage news entries for mmoshowdown.cc</p>

<?php if ($msg): ?>
<div class="toast"><?= esc($msg) ?></div>
<?php endif; ?>

<?php if ($editEntry): ?>
<!-- edit form -->
<a href="<?= esc($_SERVER['PHP_SELF']) ?>" class="back-link">&larr; back to list</a>
<div class="form-card">
  <h2>Edit Entry</h2>
  <form method="post">
    <input type="hidden" name="action" value="edit">
    <input type="hidden" name="id" value="<?= $editEntry['id'] ?>">
    <div class="field">
      <label>Title</label>
      <input type="text" name="title" value="<?= esc($editEntry['title']) ?>" required>
    </div>
    <div class="field">
      <label>Body</label>
      <textarea name="body" rows="4"><?= esc($editEntry['body']) ?></textarea>
      <div class="hint">supports &lt;a href="..."&gt; links in body text</div>
    </div>
    <div class="field">
      <label>Date</label>
      <input type="date" name="date" value="<?= esc($editEntry['date']) ?>">
    </div>
    <div class="btn-row">
      <button type="submit" class="btn btn-primary">Save Changes</button>
      <a href="<?= esc($_SERVER['PHP_SELF']) ?>" class="btn btn-ghost">Cancel</a>
    </div>
  </form>
</div>

<?php else: ?>
<!-- add form -->
<div class="form-card">
  <h2>Add Entry</h2>
  <form method="post">
    <input type="hidden" name="action" value="add">
    <div class="field">
      <label>Title</label>
      <input type="text" name="title" placeholder="patch notes, event announcement, etc." required>
    </div>
    <div class="field">
      <label>Body</label>
      <textarea name="body" rows="4" placeholder="entry content..."></textarea>
      <div class="hint">supports &lt;a href="..."&gt; links in body text</div>
    </div>
    <div class="field">
      <label>Date</label>
      <input type="date" name="date" value="<?= date('Y-m-d') ?>">
    </div>
    <button type="submit" class="btn btn-primary">Add Entry</button>
  </form>
</div>

<!-- entries list -->
<h2 class="entries-header">Entries (<?= count($entries) ?>)</h2>

<?php if (empty($entries)): ?>
<div class="empty">no entries yet - add one above</div>
<?php endif; ?>

<?php foreach ($entries as $e): ?>
<div class="entry-card">
  <div class="entry-meta">
    <span class="entry-date"><?= esc($e['date'] ?? '') ?></span>
    <span class="entry-id">id: <?= $e['id'] ?? '?' ?></span>
  </div>
  <div class="entry-title"><?= esc($e['title'] ?? '') ?></div>
  <div class="entry-body"><?= esc($e['body'] ?? '') ?></div>
  <div class="entry-actions">
    <a href="?edit=<?= $e['id'] ?>" class="btn btn-ghost">Edit</a>
    <form method="post" style="display:inline" onsubmit="return confirm('Delete this entry?')">
      <input type="hidden" name="action" value="delete">
      <input type="hidden" name="id" value="<?= $e['id'] ?>">
      <button type="submit" class="btn btn-danger">Delete</button>
    </form>
  </div>
</div>
<?php endforeach; ?>

<?php endif; ?>

</div>
</body>
</html>
