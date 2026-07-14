const albumList = document.querySelector("#albums");
const categoryFilter = document.querySelector("#category-filter");
const dateSortButton = document.querySelector("#date-sort");
const dateHeader = document.querySelector("#date-header");
const sortIndicator = document.querySelector("#sort-indicator");
const resultCount = document.querySelector("#result-count");
const plainText = document.querySelector("#plain-text");
const copyButton = document.querySelector("#copy-button");

const initialParams = new URLSearchParams(window.location.search);
const initialCategory = initialParams.get("category") || "";

let allAlbums = [];
let dateOrder = initialParams.get("date") === "oldest" ? "oldest" : "newest";

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
  const item = document.createElement("tr");
  item.className = "album";

  const date = document.createElement("td");
  date.className = "album-date";
  date.textContent = album.date || "—";

  const name = document.createElement("td");
  name.className = "album-name";
  name.textContent = album.name;

  const categoryCell = document.createElement("td");
  if (album.category) {
    const category = document.createElement("span");
    category.className = "album-category";
    category.textContent = album.category;
    categoryCell.append(category);
  } else {
    categoryCell.textContent = "—";
  }

  const linkCell = document.createElement("td");
  const link = document.createElement("a");
  link.className = "album-link";
  link.href = album.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open ↗";
  linkCell.append(link);

  item.append(date, name, categoryCell, linkCell);
  return item;
};

const showMessage = (message, isError = false) => {
  const row = document.createElement("tr");
  const item = document.createElement("td");
  item.className = isError ? "message message--error" : "message";
  item.colSpan = 4;
  item.textContent = message;
  row.append(item);
  albumList.replaceChildren(row);
};

const renderAlbums = () => {
  const category = categoryFilter.value;
  const direction = dateOrder === "oldest" ? 1 : -1;

  const visibleAlbums = allAlbums
    .filter((album) => !category || album.category === category)
    .sort((a, b) => {
      const aDate = (a.date || "").slice(0, 10);
      const bDate = (b.date || "").slice(0, 10);

      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.localeCompare(bDate) * direction;
    });

  resultCount.textContent = `${visibleAlbums.length} album${visibleAlbums.length === 1 ? "" : "s"}`;
  plainText.value = visibleAlbums
    .map((album) => `${album.name} ${album.url}`)
    .join("\n");
  copyButton.disabled = visibleAlbums.length === 0;

  const params = new URLSearchParams(window.location.search);
  if (dateOrder === "oldest") {
    params.set("date", "oldest");
  } else {
    params.delete("date");
  }

  if (category) {
    params.set("category", category);
  } else {
    params.delete("category");
  }

  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", url);

  if (visibleAlbums.length === 0) {
    showMessage("No albums match this category.");
    return;
  }

  albumList.replaceChildren(...visibleAlbums.map(createAlbumItem));
};

const copyPlainText = async () => {
  if (!plainText.value) return;

  try {
    await navigator.clipboard.writeText(plainText.value);
    copyButton.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.textContent = "Copy all";
    }, 1400);
  } catch (error) {
    console.error(error);
    plainText.focus();
    plainText.select();
    copyButton.textContent = "Selected — press Copy";
  }
};

const updateDateSortUI = () => {
  const isNewest = dateOrder === "newest";

  sortIndicator.textContent = isNewest ? "↓" : "↑";
  dateHeader.setAttribute("aria-sort", isNewest ? "descending" : "ascending");
  dateSortButton.title = isNewest ? "Show oldest first" : "Show newest first";
};

const toggleDateOrder = () => {
  dateOrder = dateOrder === "newest" ? "oldest" : "newest";
  updateDateSortUI();

  renderAlbums();
};

const setCategoryOptions = (albums) => {
  const categories = [...new Set(albums.map((album) => album.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.append(option);
  });
};

const loadAlbums = async () => {
  try {
    const response = await fetch("albums.yaml", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const albums = parseYaml(await response.text());
    allAlbums = albums.filter((album) => album.name && album.url);

    if (allAlbums.length === 0) {
      showMessage("No albums are available.");
      return;
    }

    setCategoryOptions(allAlbums);
    if (allAlbums.some((album) => album.category === initialCategory)) {
      categoryFilter.value = initialCategory;
    }
    renderAlbums();
  } catch (error) {
    console.error(error);
    showMessage("The albums could not be loaded.", true);
  }
};

categoryFilter.addEventListener("change", renderAlbums);
dateSortButton.addEventListener("click", toggleDateOrder);
copyButton.addEventListener("click", copyPlainText);

updateDateSortUI();
loadAlbums();
