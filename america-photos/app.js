const albumList = document.querySelector("#albums");

// Parses the simple list-and-string YAML format used by albums.yaml.
const parseYaml = (source) => {
  const albums = [];
  let currentAlbum = null;

  const parseValue = (value) => {
    const trimmed = value.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return JSON.parse(trimmed);
    }
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return trimmed.slice(1, -1).replaceAll("''", "'");
    }
    return trimmed;
  };

  source.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const startsItem = trimmed.startsWith("- ");
    const property = (startsItem ? trimmed.slice(2) : trimmed)
      .match(/^([a-zA-Z][\w-]*):\s*(.*)$/);

    if (!property) {
      throw new Error(`Check the format on line ${index + 1}.`);
    }

    if (startsItem) {
      currentAlbum = {};
      albums.push(currentAlbum);
    }

    if (!currentAlbum) {
      throw new Error(`Line ${index + 1} must begin with "- name:".`);
    }

    currentAlbum[property[1]] = parseValue(property[2]);
  });

  return albums;
};

const createAlbumItem = (album) => {
  const item = document.createElement("li");
  item.className = "album";

  const info = document.createElement("div");

  const name = document.createElement("p");
  name.className = "album-name";
  name.textContent = album.name;
  info.append(name);

  if (album.category) {
    const category = document.createElement("span");
    category.className = "album-category";
    category.textContent = album.category;
    info.append(category);
  }

  const link = document.createElement("a");
  link.className = "album-link";
  link.href = album.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open in Amazon Photos ↗";

  item.append(info, link);
  return item;
};

const showError = (message) => {
  const item = document.createElement("li");
  item.className = "message message--error";
  item.textContent = message;
  albumList.replaceChildren(item);
};

const loadAlbums = async () => {
  try {
    const response = await fetch("albums.yaml", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const albums = parseYaml(await response.text());
    const validAlbums = albums.filter((album) => album.name && album.url);

    if (validAlbums.length === 0) {
      showError("No albums are available.");
      return;
    }

    albumList.replaceChildren(...validAlbums.map(createAlbumItem));
  } catch (error) {
    console.error(error);
    showError("The albums could not be loaded.");
  }
};

loadAlbums();
