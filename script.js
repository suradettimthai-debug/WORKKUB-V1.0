document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // I. Element and State Initialization
    // ----------------------------------------------------
    const subjectList = document.getElementById('subject-list');
    const createBtn = document.getElementById('create-btn');
    const pendingCountSpan = document.getElementById('pending-count');
    const subjectCountSpan = document.getElementById('subject-count');
    const tabs = document.querySelectorAll('.tab');
    const searchInput = document.getElementById('search-input');

    // Modals and Forms
    const addModal = document.getElementById('add-task-modal');
    const addTaskForm = document.getElementById('add-task-form');
    const subjectNameInput = document.getElementById('subject-name');
    const taskNameInput = document.getElementById('task-name');
    const dueDateInput = document.getElementById('due-date');
    const importanceSelect = document.getElementById('importance');
    const taskImagesInput = document.getElementById('task-images');

    const editModal = document.getElementById('edit-task-modal');
    const editTaskForm = document.getElementById('edit-task-form');
    const editSubjectIdInput = document.getElementById('edit-subject-id');
    const editTaskIdInput = document.getElementById('edit-task-id');
    const editTaskNameInput = document.getElementById('edit-task-name');
    const editDueDateInput = document.getElementById('edit-due-date');
    const editImportanceSelect = document.getElementById('edit-importance');
    const currentImagesPreview = document.getElementById('current-images-preview');
    const editTaskImagesInput = document.getElementById('edit-task-images');

    const imageViewModal = document.getElementById('image-view-modal');
    const imageViewerContainer = document.getElementById('image-viewer-container');

    // Data State
    let data = JSON.parse(localStorage.getItem('homeworkData')) || {
        subjects: []
    };
    let currentFilter = 'all'; // Default filter
    let currentSearchQuery = '';
    let originalImages = []; // Array to hold base64 images during edit for deletion control

    // ----------------------------------------------------
    // II. Utility Functions
    // ----------------------------------------------------

    function saveData() {
        localStorage.setItem('homeworkData', JSON.stringify(data));
    }

    function findTask(subjectId, taskId) {
        const subject = data.subjects.find(s => s.id == subjectId);
        if (!subject) return { subject: null, task: null };
        const task = subject.tasks.find(t => t.id == taskId);
        return { subject, task };
    }

    function getImportanceClass(importance) {
        switch (importance) {
            case 'มาก':
                return 'high-importance';
            case 'ปานกลาง':
                return 'medium-importance';
            case 'น้อย':
                return 'low-importance';
            default:
                return '';
        }
    }

    function getFilterName(filter) {
        switch (filter) {
            case 'all':
                return 'ทั้งหมด';
            case 'pending':
                return 'ค้าง';
            case 'completed':
                return 'เสร็จแล้ว';
            default:
                return 'ทั้งหมด';
        }
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // ----------------------------------------------------
    // III. UI and Rendering Functions
    // ----------------------------------------------------

    function openModal(modal) {
        modal.style.display = 'flex';
    }

    function closeModal(modal) {
        modal.style.display = 'none';
        // Clear file inputs on close
        if (modal.id === 'add-task-modal') {
             taskImagesInput.value = '';
        } else if (modal.id === 'edit-task-modal') {
             editTaskImagesInput.value = '';
        }
    }

    function updateSummary() {
        const pendingTasks = data.subjects.reduce((count, subject) => {
            return count + subject.tasks.filter(task => !task.completed).length;
        }, 0);
        pendingCountSpan.textContent = pendingTasks;
        subjectCountSpan.textContent = data.subjects.length;
    }

    function createTaskItem(subjectId, task) {
        const importanceClass = getImportanceClass(task.importance);
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';

        let detailsHTML = `
            <div class="task-details">
                <span class="due-date"><i class="far fa-calendar-alt"></i>กำหนดส่ง: ${task.dueDate}</span>
                <span class="importance ${importanceClass}"><i class="fas fa-exclamation-circle"></i>ความสำคัญ: ${task.importance}</span>
            </div>
        `;

        if (task.images && task.images.length > 0) {
            const firstImage = task.images[0];
            const imageCountSpan = task.images.length > 1 ? `<span style="position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.5); color: white; padding: 2px 5px; font-size: 10px; border-radius: 0 0 4px 0;">+${task.images.length}</span>` : '';

            const imagePreview = `
                <div class="image-preview-container view-images-btn" 
                     data-subject-id="${subjectId}" data-task-id="${task.id}" 
                     title="คลิกเพื่อดูรูปภาพ">
                    <img src="${firstImage}" alt="แนบรูป">
                    ${imageCountSpan}
                </div>
            `;
            detailsHTML += `<div class="task-images-preview">${imagePreview}</div>`;
        }

        taskItem.innerHTML = `
            <input type="checkbox" data-subject-id="${subjectId}" data-task-id="${task.id}" ${task.completed ? 'checked' : ''}>
            <div class="task-content">
                <label><i class="fas fa-clipboard-list"></i>${task.name}</label>
                ${detailsHTML}
            </div>
            <div class="task-actions">
                <button class="edit-task-btn" data-subject-id="${subjectId}" data-task-id="${task.id}" title="แก้ไขงาน"><i class="fas fa-edit"></i></button>
                <button class="delete-task-btn" data-subject-id="${subjectId}" data-task-id="${task.id}" title="ลบงาน"><i class="fas fa-trash"></i></button>
            </div>
        `;
        return taskItem;
    }

    function renderEditTaskImages(task) {
        currentImagesPreview.innerHTML = '';
        // Save the original images to a temporary array for manipulation
        originalImages = [...(task.images || [])]; 

        originalImages.forEach((base64URL, index) => {
            const container = document.createElement('div');
            container.className = 'image-preview-container';
            container.style.position = 'relative'; 
            
            container.innerHTML = `
                <img src="${base64URL}" alt="แนบรูป">
                <button type="button" class="delete-image-btn" data-index="${index}" title="ลบรูปภาพ"><i class="fas fa-times"></i></button>
            `;
            currentImagesPreview.appendChild(container);
        });
    }

    function openImageViewer(images) {
        imageViewerContainer.innerHTML = '';
        if (images && images.length > 0) {
            images.forEach(base64URL => {
                const imgContainer = document.createElement('div');
                imgContainer.innerHTML = `<img src="${base64URL}" alt="แนบรูป">`;
                imageViewerContainer.appendChild(imgContainer);
            });
        } else {
            imageViewerContainer.innerHTML = '<p style="text-align: center;">ไม่มีรูปภาพที่แนบมา</p>';
        }
        openModal(imageViewModal);
    }

    function render(searchQuery = currentSearchQuery, filter = currentFilter) {
        subjectList.innerHTML = '';
        const normalizedQuery = searchQuery.toLowerCase().trim();
        let subjectsToDisplay = [];

        data.subjects.forEach(subject => {
            const subjectMatches = subject.name.toLowerCase().includes(normalizedQuery);

            const filteredTasks = subject.tasks.filter(task => {
                const taskMatches = task.name.toLowerCase().includes(normalizedQuery);
                const isPending = !task.completed;
                const isCompleted = task.completed;
                const filterCondition = (filter === 'all') ||
                    (filter === 'pending' && isPending) ||
                    (filter === 'completed' && isCompleted);

                return (subjectMatches || taskMatches) && filterCondition;
            });

            if (filteredTasks.length > 0 || subjectMatches) {
                // Clone the subject and tasks to prevent accidental modifications to the main data during rendering
                subjectsToDisplay.push({ ...subject, tasks: filteredTasks });
            }
        });

        if (subjectsToDisplay.length === 0) {
            const filterName = getFilterName(filter);
            const message = normalizedQuery ? 
                `ไม่พบงานสำหรับ '${searchQuery}' ในหมวดหมู่ '${filterName}'` :
                `ไม่มีงานในหมวดหมู่ '${filterName}'`;

            subjectList.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
        } else {
            subjectsToDisplay.forEach(subject => {
                const subjectCard = document.createElement('div');
                subjectCard.className = 'subject-card';

                subjectCard.innerHTML = `
                    <div class="subject-header">
                        <h3>${subject.name}</h3>
                        <div class="subject-actions">
                            <button class="edit-subject-btn" data-subject-id="${subject.id}" title="แก้ไขรายวิชา"><i class="fas fa-edit"></i></button>
                            <button class="delete-subject-btn" data-subject-id="${subject.id}" title="ลบรายวิชา"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;

                // Render filtered tasks
                subject.tasks.forEach(task => {
                    subjectCard.appendChild(createTaskItem(subject.id, task));
                });
                
                // Only display the card if it has tasks OR if it was matched by search/filter and there are no tasks
                if (subject.tasks.length > 0) {
                    subjectList.appendChild(subjectCard);
                } else if (!normalizedQuery && filter === 'all') {
                     // Show empty subject only if not filtering/searching
                     subjectList.appendChild(subjectCard);
                }
            });
        }
        updateSummary();
    }
    
    // ----------------------------------------------------
    // IV. Event Handlers - Data Manipulation (CRUD)
    // ----------------------------------------------------
    
    // 1. Add Task (Form Submission)
    addTaskForm.addEventListener('submit', async (event) => { 
        event.preventDefault();
        const subjectName = subjectNameInput.value.trim();
        const taskName = taskNameInput.value.trim();
        const dueDate = dueDateInput.value || 'ไม่มี';
        const importance = importanceSelect.value;
        const taskId = Date.now();
        let subject = data.subjects.find(s => s.name === subjectName);

        const imageFiles = taskImagesInput.files;
        const base64Promises = [];

        for (let i = 0; i < imageFiles.length; i++) {
            base64Promises.push(fileToBase64(imageFiles[i]));
        }
        
        const base64URLs = (await Promise.all(base64Promises)).filter(url => url !== null);

        if (!subject) {
            const subjectId = Date.now() + 1; // Ensure different ID
            subject = {
                id: subjectId,
                name: subjectName,
                tasks: []
            };
            data.subjects.push(subject);
        }

        const newTask = {
            id: taskId,
            name: taskName,
            dueDate: dueDate,
            importance: importance,
            completed: false,
            images: base64URLs
        };

        subject.tasks.push(newTask);
        
        saveData();
        closeModal(addModal);
        render();
    });

    // 2. Edit Task (Form Submission)
    editTaskForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const subjectId = editSubjectIdInput.value;
        const taskId = editTaskIdInput.value;
        
        const { subject, task } = findTask(subjectId, taskId);

        if (task) {
            const newTaskName = editTaskNameInput.value.trim();
            const newDueDate = editDueDateInput.value || 'ไม่มี';
            const newImportance = editImportanceSelect.value;

            // 1. Handle new image uploads
            const newImageFiles = editTaskImagesInput.files;
            const newBase64Promises = [];
            for (let i = 0; i < newImageFiles.length; i++) {
                newBase64Promises.push(fileToBase64(newImageFiles[i]));
            }
            const newBase64URLs = (await Promise.all(newBase64Promises)).filter(url => url !== null);

            // 2. Combine old (originalImages array, which has been modified by user) and new images
            const finalImages = [...originalImages, ...newBase64URLs];

            // 3. Update the task object
            task.name = newTaskName;
            task.dueDate = newDueDate;
            task.importance = newImportance;
            task.images = finalImages;

            saveData();
            closeModal(editModal);
            render();
        }
    });

    // 3. Delegate Clicks for all Actions (Checkbox, Edit/Delete Task/Subject, View Image)
    subjectList.addEventListener('click', (event) => {
        const target = event.target;

        // Checkbox Toggle
        if (target.type === 'checkbox') {
            const subjectId = target.dataset.subjectId;
            const taskId = target.dataset.taskId;
            const { task } = findTask(subjectId, taskId);
            if (task) {
                task.completed = target.checked;
                saveData();
                render(); // Re-render to apply filter/sort if needed
            }
        } 
        // Edit Task Button
        else if (target.closest('.edit-task-btn')) {
            const btn = target.closest('.edit-task-btn');
            const subjectId = btn.dataset.subjectId;
            const taskId = btn.dataset.taskId;
            
            const { task } = findTask(subjectId, taskId);
            if (task) {
                editSubjectIdInput.value = subjectId;
                editTaskIdInput.value = taskId;
                editTaskNameInput.value = task.name;
                editDueDateInput.value = task.dueDate === 'ไม่มี' ? '' : task.dueDate;
                editImportanceSelect.value = task.importance;

                renderEditTaskImages(task);
                openModal(editModal);
            }
        }
        // Delete Task Button
        else if (target.closest('.delete-task-btn')) {
            const btn = target.closest('.delete-task-btn');
            const subjectId = btn.dataset.subjectId;
            const taskId = btn.dataset.taskId;
            
            if (confirm('คุณแน่ใจไหมที่จะลบงานนี้?')) {
                const { subject } = findTask(subjectId, taskId);
                if (subject) {
                    subject.tasks = subject.tasks.filter(t => t.id != taskId);
                    
                    // Remove subject if it has no tasks left
                    if (subject.tasks.length === 0) {
                        data.subjects = data.subjects.filter(s => s.id != subjectId);
                    }
                    saveData();
                    render();
                }
            }
        }
        // Edit Subject Button
        else if (target.closest('.edit-subject-btn')) {
            const btn = target.closest('.edit-subject-btn');
            const subjectId = btn.dataset.subjectId;
            const subject = data.subjects.find(s => s.id == subjectId);
            if (subject) {
                const newName = prompt(`แก้ไขชื่อวิชา: ${subject.name}`, subject.name);
                if (newName && newName.trim() !== subject.name) {
                    subject.name = newName.trim();
                    saveData();
                    render();
                }
            }
        }
        // Delete Subject Button
        else if (target.closest('.delete-subject-btn')) {
            const btn = target.closest('.delete-subject-btn');
            const subjectId = btn.dataset.subjectId;
            if (confirm('คุณแน่ใจไหมที่จะลบวิชาและงานทั้งหมดในวิชานี้?')) {
                data.subjects = data.subjects.filter(s => s.id != subjectId);
                saveData();
                render();
            }
        }
        // View Images Button
        else if (target.closest('.view-images-btn')) {
            const btn = target.closest('.view-images-btn');
            const subjectId = btn.dataset.subjectId;
            const taskId = btn.dataset.taskId;
            const { task } = findTask(subjectId, taskId);
            if (task && task.images) {
                openImageViewer(task.images);
            }
        }
    });

    // 4. Delete Image during Edit (Delegation)
    currentImagesPreview.addEventListener('click', (event) => {
        const btn = event.target.closest('.delete-image-btn');
        if (btn) {
            const index = parseInt(btn.dataset.index);
            // Remove the image from the temporary array
            originalImages.splice(index, 1); 
            // Re-render the image previews in the edit modal
            renderEditTaskImages({ images: originalImages }); 
        }
    });


    // ----------------------------------------------------
    // V. Filter and Search
    // ----------------------------------------------------

    // Tab Filtering
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active to clicked tab
            tab.classList.add('active');
            
            currentFilter = tab.dataset.tab;
            render(currentSearchQuery, currentFilter);
        });
    });

    // Search Filtering
    searchInput.addEventListener('input', (event) => {
        currentSearchQuery = event.target.value;
        render(currentSearchQuery, currentFilter);
    });

    // ----------------------------------------------------
    // VI. Modal Close Handlers (using delegation for all modals)
    // ----------------------------------------------------

    createBtn.addEventListener('click', () => {
        addTaskForm.reset();
        openModal(addModal);
    });

    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('close-btn') || event.target.classList.contains('cancel-btn')) {
            const modalId = event.target.dataset.modal;
            if (modalId) {
                closeModal(document.getElementById(modalId));
            }
        }
        // Close modal when clicking outside
        if (event.target.classList.contains('modal')) {
            closeModal(event.target);
        }
    });
    
    // Initial render when the page loads
    render(); 
});