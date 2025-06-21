// app.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const basicAuth = require('express-basic-auth');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// 認証設定（管理画面用）
app.use('/admin', basicAuth({
  users: { izumi: '828' }, // ← 好きなID/パスワードに変更
  challenge: true
}));

app.post('/admin/delete/:id', (req, res) => {
  const posts = fs.existsSync(DATA_FILE)
    ? JSON.parse(fs.readFileSync(DATA_FILE))
    : [];

    console.log('投稿データ読み込み完了');

  const targetPost = posts.find(p => p.id.toString() === req.params.id);
  console.log('対象の投稿:', targetPost);
  
  if (targetPost && targetPost.imagePath) {
    const imagePath = path.join(__dirname, 'public', targetPost.imagePath);
    console.log('画像パス:', imagePath);

    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('画像を削除しました:', imagePath);
      }
    } catch (err) {
      console.error('画像削除エラー:', err);
    }
  }

  const updatedPosts = posts.filter(p => p.id.toString() !== req.params.id);
  fs.writeFileSync(DATA_FILE, JSON.stringify(updatedPosts, null, 2));

  res.redirect('http://localhost:3000/blog');
});

// テンプレートエンジン設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 静的ファイル
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// 画像アップロード設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    cb(null, `img_${timestamp}${ext}`);
  }
});
const upload = multer({ storage });

// データファイルの読み込み
const DATA_FILE = path.join(__dirname, 'data/posts.json');

// 管理画面：投稿フォーム表示
app.get('/admin', (req, res) => {
  res.render('admin');
});

// 投稿処理
app.post('/admin/post', upload.single('image'), (req, res) => {
  const { title, content } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  const newPost = {
    id: Date.now(),
    title,
    content,
    imagePath,
    createdAt: new Date().toISOString()
  };

  const posts = fs.existsSync(DATA_FILE)
    ? JSON.parse(fs.readFileSync(DATA_FILE))
    : [];

  posts.unshift(newPost); // 新着を上に追加

  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
  res.redirect('/blog');
});

// ブログ一覧
app.get('/blog', (req, res) => {
  const posts = fs.existsSync(DATA_FILE)
    ? JSON.parse(fs.readFileSync(DATA_FILE))
    : [];
  res.render('blog', { posts });
});

// 記事詳細
app.get('/blog/:id', (req, res) => {
  const posts = JSON.parse(fs.readFileSync(DATA_FILE));
  const post = posts.find(p => p.id.toString() === req.params.id);
  if (!post) return res.status(404).send('記事が見つかりません');
  res.render('post', { post });
});

// 起動
app.listen(port, () => {
  console.log(`Server started: http://localhost:${port}`);
});