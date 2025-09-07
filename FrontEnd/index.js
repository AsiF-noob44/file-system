const API_URL = "http://localhost:3000";
let isEditMode = false;
let editingFileName = null;

async function createFile() {
  const fileName = document.getElementById("fileName").value.trim();
  const extension = document.getElementById("fileExtension").value;
  const content = document.getElementById("fileContent").value;

  if (!fileName) {
    showNotification("File name is required", "error");
    return;
  }

  // Remove extension from filename if user typed it for clarity.
  const cleanFileName = fileName.replace(/\.(txt|md|log|csv|json)$/i, "");
  const fullFileName = cleanFileName + extension;

  try {
    if (isEditMode && editingFileName) {
      // Update existing file
      await updateFile(editingFileName, fullFileName, content);
    } else {
      // Create new file
      await createNewFile(fullFileName, content);
    }
  } catch (error) {
    showNotification("Error: " + error.message, "error");
  }
}

async function createNewFile(fileName, content) {
  const response = await fetch(`${API_URL}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, content }),
  });
  const result = await response.json();

  if (response.status === 201) {
    showNotification("File created successfully!", "success");
    resetForm();
    loadFiles();
  } else {
    showNotification(result.error || "Error creating file", "error");
  }
}

async function updateFile(oldFileName, newFileName, content) {
  // If filename changed, delete old and create new
  if (oldFileName !== newFileName) {
    await fetch(`${API_URL}/files/${oldFileName}`, { method: "DELETE" });
  }

  const response = await fetch(`${API_URL}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: newFileName, content }),
  });
  const result = await response.json();

  if (response.status === 201) {
    showNotification("File updated successfully!", "success");
    resetForm();
    loadFiles();
  } else {
    showNotification(result.error || "Error updating file", "error");
  }
}

function resetForm() {
  document.getElementById("fileName").value = "";
  document.getElementById("fileContent").value = "";
  document.getElementById("fileExtension").value = ".txt";
  isEditMode = false;
  editingFileName = null;
  updateCreateButton();
}

function updateCreateButton() {
  const button = document.querySelector(".btn-create");
  if (isEditMode) {
    button.innerHTML = "Update File";
    button.style.background = "linear-gradient(135deg, #8b5cf6, #7c3aed)";
  } else {
    button.innerHTML = "Create File";
    button.style.background = "linear-gradient(135deg, #10b981, #059669)";
  }
}

async function loadFiles() {
  try {
    const response = await fetch(`${API_URL}/files`);
    const files = await response.json();
    const fileList = document.getElementById("fileList");

    if (files.length === 0) {
      fileList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">No Files</div>
          <p>No files found</p>
          <span>Create your first file above!</span>
        </div>
      `;
      return;
    }

    fileList.innerHTML = files
      .map((file) => {
        const extension = getFileExtension(file);
        const icon = getFileIcon(extension);
        const fileNameWithoutExt = file.replace(/\.[^/.]+$/, "");

        return `
          <div class="file-item">
            <div class="file-info">
              <span class="file-icon">${icon}</span>
              <div class="file-details">
                <span class="file-name">${fileNameWithoutExt}</span>
                <span class="file-extension">${extension}</span>
              </div>
            </div>
            <div class="file-actions">
              <button class="btn-read" onclick="readFile('${file}')" title="Read file">
                Read
              </button>
              <button class="btn-edit" onclick="editFileFromList('${file}')" title="Edit file">
                Edit
              </button>
              <button class="btn-delete" onclick="deleteFile('${file}')" title="Delete file">
                Delete
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    showNotification("Error loading files: " + error.message, "error");
  }
}

function getFileExtension(filename) {
  return filename.substring(filename.lastIndexOf("."));
}

function getFileIcon(extension) {
  const icons = {
    ".txt": "TXT",
    ".md": "MD",
    ".log": "LOG",
    ".csv": "CSV",
    ".json": "JSON",
  };
  return icons[extension] || "FILE";
}

async function readFile(fileName) {
  try {
    const response = await fetch(`${API_URL}/files/${fileName}`);
    if (response.ok) {
      const fileContent = await response.text();

      // Create a modal-like display for file content
      const modal = document.createElement("div");
      modal.className = "file-modal";
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>File: ${fileName}</h3>
            <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
          </div>
          <div class="modal-body">
            <pre>${fileContent}</pre>
          </div>
          <div class="modal-footer">
            <button class="btn-close" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    } else {
      const error = await response.json();
      showNotification(
        error.message || error.error || "Error reading file",
        "error"
      );
    }
  } catch (error) {
    showNotification("Error reading file: " + error.message, "error");
  }
}

function editFile(fileName, content) {
  const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  const extension = getFileExtension(fileName);

  document.getElementById("fileName").value = fileNameWithoutExt;
  document.getElementById("fileExtension").value = extension;
  document.getElementById("fileContent").value = content;

  // Set edit mode
  isEditMode = true;
  editingFileName = fileName;
  updateCreateButton();

  // Remove the modal
  document.querySelector(".file-modal").remove();
  // Scroll to top to show the form
  window.scrollTo({ top: 0, behavior: "smooth" });
  showNotification("File loaded for editing", "info");
}

function editFileFromList(fileName) {
  readFileForEdit(fileName);
}

async function readFileForEdit(fileName) {
  try {
    const response = await fetch(`${API_URL}/files/${fileName}`);
    if (response.ok) {
      const fileContent = await response.text();
      const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
      const extension = getFileExtension(fileName);

      document.getElementById("fileName").value = fileNameWithoutExt;
      document.getElementById("fileExtension").value = extension;
      document.getElementById("fileContent").value = fileContent;

      // Set edit mode
      isEditMode = true;
      editingFileName = fileName;
      updateCreateButton();

      // Scroll to top to show the form
      window.scrollTo({ top: 0, behavior: "smooth" });
      showNotification("File loaded for editing", "info");
    } else {
      const error = await response.json();
      showNotification(
        error.message || error.error || "Error reading file",
        "error"
      );
    }
  } catch (error) {
    showNotification("Error reading file: " + error.message, "error");
  }
}

async function deleteFile(fileName) {
  if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

  try {
    const response = await fetch(`${API_URL}/files/${fileName}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (response.ok) {
      showNotification("File deleted successfully!", "success");
      loadFiles();
    } else {
      showNotification(result.error || "Error deleting file", "error");
    }
  } catch (error) {
    showNotification("Error deleting file: " + error.message, "error");
  }
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span class="notification-message">${message}</span>
    <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}

// Load files when page loads
window.addEventListener("load", loadFiles);
