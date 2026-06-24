/**
 * admin.js
 * Gestión del panel de administración.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar Autenticación
    const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '../index.html';
        return;
    }

    /**
     * Decodifica un JWT para recuperar el payload (fallback si el localStorage está incompleto)
     */
    const parseJwt = (t) => {
        try {
            const base64Url = t.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    };

    // Recuperar datos base con fallback de JWT
    const payloadJwt = parseJwt(token);
    const getStoredOrJwt = (key, jwtKey) => {
        const stored = localStorage.getItem(key);
        if (stored && stored !== 'undefined' && stored !== 'null' && stored !== '') return stored;
        
        // Fallback a JWT (Soportar múltiples nombres de campo como correo/email)
        if (!payloadJwt) return '';
        if (jwtKey === 'correo') return payloadJwt.correo || payloadJwt.email || '';
        if (jwtKey === 'nombre') return payloadJwt.nombre || payloadJwt.name || '';
        if (jwtKey === 'apellido') return payloadJwt.apellido || payloadJwt.lastname || '';
        if (jwtKey === 'usuario') return payloadJwt.usuario || payloadJwt.username || '';
        
        return payloadJwt[jwtKey] || '';
    };

    // Personalizar Bienvenida
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = getStoredOrJwt('usuario_nombre', 'nombre') || 'Admin';
    }

    // --- LÓGICA DE SIDEBAR ---
    const menuBtn = document.getElementById('menuBtn');
    const userSidebar = document.getElementById('userSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sideLogoutBtn = document.getElementById('sideLogoutBtn');
    const userInitialsEl = document.getElementById('userInitials');
    const sideUserNameEl = document.getElementById('sideUserName');
    const sideUserEmailEl = document.getElementById('sideUserEmail');

    const toggleSidebar = (show) => {
        if (show) {
            userSidebar.classList.remove('translate-x-full');
            sidebarOverlay.classList.remove('hidden');
        } else {
            userSidebar.classList.add('translate-x-full');
            sidebarOverlay.classList.add('hidden');
        }
    };

    if (menuBtn && userSidebar) {
        menuBtn.addEventListener('click', () => {
            const nombre = getStoredOrJwt('usuario_nombre', 'nombre') || 'Admin';
            const email = getStoredOrJwt('usuario_correo', 'correo') || 'admin@sistema.com';
            const iniciales = nombre.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            
            if (userInitialsEl) userInitialsEl.textContent = iniciales;
            if (sideUserNameEl) sideUserNameEl.textContent = nombre;
            if (sideUserEmailEl) sideUserEmailEl.textContent = email;

            toggleSidebar(true);
        });

        closeSidebarBtn.addEventListener('click', () => toggleSidebar(false));
        sidebarOverlay.addEventListener('click', () => toggleSidebar(false));
    }

    // 2. Verificar Permisos de Administrador
    const checkAdminAccess = async () => {
        try {
            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.codigo !== "1") {
                    window.location.href = 'dashboard.html';
                }
            } else {
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            console.error('Error al verificar permisos de admin:', error);
            window.location.href = 'dashboard.html';
        }
    };
    checkAdminAccess();

    // 3. Referencias UI de Notificaciones
    const notificationModal = document.getElementById('notificationModal');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    const closeNotificationBtn = document.getElementById('closeNotificationBtn');

    // 4. Manejo de Botones de Acción
    const adminButtons = document.querySelectorAll('.admin-action-btn');
    const catalogModal = document.getElementById('catalogModal');
    const closeCatalogModalBtn = document.getElementById('closeCatalogModalBtn');
    const catalogForm = document.getElementById('catalogForm');
    const saveCatalogBtn = document.getElementById('saveCatalogBtn');
    const catalogFormError = document.getElementById('catalogFormError');
    const catalogFormErrorMessage = document.getElementById('catalogFormErrorMessage');

    // 5. Referencias Modal Listar Catálogo
    const listarCatalogModal = document.getElementById('listarCatalogModal');
    const closeListarCatalogModalBtn = document.getElementById('closeListarCatalogModalBtn');
    const listarCatalogTableBody = document.getElementById('listarCatalogTableBody');
    const listarCatalogError = document.getElementById('listarCatalogError');
    const listarCatalogErrorMessage = document.getElementById('listarCatalogErrorMessage');

    // Referencias para la imagen y selector de tipo
    const btnTypeUrl = document.getElementById('btnTypeUrl');
    const btnTypeFile = document.getElementById('btnTypeFile');
    const containerUrl = document.getElementById('containerUrl');
    const containerFile = document.getElementById('containerFile');
    const catImagenUrl = document.getElementById('cat_imagen');
    const catFileInput = document.getElementById('cat_file');
    const fileLabel = document.getElementById('fileLabel');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeImageBtn = document.getElementById('removeImageBtn');

    let base64Image = null;
    let activeImageType = 'url'; // 'url' o 'file'
    let editingCatalog = null; // null = crear, objeto = editando

    // Lógica de cambio de tipo
    const switchImageType = (type) => {
        activeImageType = type;
        if (type === 'url') {
            btnTypeUrl.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
            btnTypeUrl.classList.remove('text-slate-400');
            btnTypeFile.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
            btnTypeFile.classList.add('text-slate-400');
            containerUrl.classList.remove('hidden');
            containerFile.classList.add('hidden');
            // Limpiar datos de archivo
            base64Image = null;
            catFileInput.value = '';
            imagePreview.src = '';
            imagePreviewContainer.classList.add('hidden');
            fileLabel.textContent = 'Arrastra o haz clic para subir captura';
        } else {
            btnTypeFile.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
            btnTypeFile.classList.remove('text-slate-400');
            btnTypeUrl.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
            btnTypeUrl.classList.add('text-slate-400');
            containerFile.classList.remove('hidden');
            containerUrl.classList.add('hidden');
            // Limpiar datos de URL
            catImagenUrl.value = '';
        }
    };

    if (btnTypeUrl) btnTypeUrl.addEventListener('click', () => switchImageType('url'));
    if (btnTypeFile) btnTypeFile.addEventListener('click', () => switchImageType('file'));

    // Lógica de Previsualización y Carga de Archivo
    if (catFileInput) {
        catFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    base64Image = event.target.result;
                    imagePreview.src = base64Image;
                    imagePreviewContainer.classList.remove('hidden');
                    fileLabel.textContent = `Archivo: ${file.name}`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', () => {
            base64Image = null;
            catFileInput.value = '';
            imagePreview.src = '';
            imagePreviewContainer.classList.add('hidden');
            fileLabel.textContent = 'Arrastra o haz clic para subir captura';
        });
    }

    // --- LÓGICA DE BAJA DE USUARIO (DINÁMICA) ---
    const deactivateUserModal = document.getElementById('deactivateUserModal');
    const closeDeactivateModalBtn = document.getElementById('closeDeactivateModalBtn');
    const userSearchInput = document.getElementById('userSearchInput');
    const userTableBody = document.getElementById('userTableBody');
    const deactivateFormError = document.getElementById('deactivateFormError');
    const deactivateFormErrorMessage = document.getElementById('deactivateFormErrorMessage');

    // Confirmación Custom
    const confirmDeactivateModal = document.getElementById('confirmDeactivateModal');
    const confirmDeactivateNameEl = document.getElementById('confirmDeactivateName');
    const finalConfirmDeactivateBtn = document.getElementById('finalConfirmDeactivateBtn');
    const cancelDeactivateBtn = document.getElementById('cancelDeactivateBtn');
    let userToDelete = null;

    let allUsers = [];
    let userListMode = 'deactivate'; // 'deactivate' | 'edit'
    let editingUser = null;

    const fetchAndRenderUsers = async () => {
        userTableBody.innerHTML = `
            <tr>
                <td colspan="3" class="px-4 py-12 text-center text-slate-400">
                    <i class="fas fa-circle-notch animate-spin text-2xl mb-2"></i>
                    <p class="text-xs">Cargando usuarios...</p>
                </td>
            </tr>
        `;
        deactivateFormError.classList.add('hidden');

        try {
            const response = await fetch('/api/listar-usuario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token })
            });

            if (response.ok) {
                allUsers = await response.json();
                renderUserTable(allUsers);
            } else {
                throw new Error('No se pudo obtener la lista de usuarios.');
            }
        } catch (error) {
            console.error('Error al listar usuarios:', error);
            deactivateFormError.classList.remove('hidden');
            deactivateFormErrorMessage.textContent = error.message;
            userTableBody.innerHTML = `<tr><td colspan="3" class="px-4 py-8 text-center text-red-400 text-xs">Error al cargar datos.</td></tr>`;
        }
    };

    const renderUserTable = (users) => {
        if (users.length === 0) {
            userTableBody.innerHTML = `<tr><td colspan="3" class="px-4 py-8 text-center text-slate-400 text-xs">No se encontraron usuarios.</td></tr>`;
            return;
        }

        userTableBody.innerHTML = users.map(user => {
            const isEditMode = userListMode === 'edit';
            return `
            <tr class="hover:bg-slate-50/50 transition-colors group">
                <td class="px-4 py-4">
                    <div class="flex flex-col">
                        <span class="text-sm font-bold text-slate-900">${user.nombre} ${user.apellido || ''}</span>
                        <span class="text-[10px] text-slate-400 font-medium tracking-tight">@${user.usuario}</span>
                    </div>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center gap-2 text-slate-500 text-xs">
                        <i class="fas fa-envelope text-[10px] text-slate-300"></i>
                        ${user.correo}
                    </div>
                </td>
                <td class="px-4 py-4 text-right">
                    ${isEditMode
                        ? `<button class="edit-user-btn px-4 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg text-[10px] font-bold transition-all" 
                            data-id="${user.id_usuario}" data-name="${user.nombre}">
                            <i class="fas fa-edit mr-1"></i>Editar
                        </button>`
                        : `<button class="deactivate-btn px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-[10px] font-bold transition-all" 
                            data-id="${user.id_usuario}" data-name="${user.nombre}">
                            Dar de baja
                        </button>`
                    }
                </td>
            </tr>`;
        }).join('');
    };

    // Buscador en tiempo real
    if (userSearchInput) {
        userSearchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allUsers.filter(u => 
                u.nombre.toLowerCase().includes(term) || 
                (u.apellido && u.apellido.toLowerCase().includes(term)) || 
                u.usuario.toLowerCase().includes(term) || 
                u.correo.toLowerCase().includes(term)
            );
            renderUserTable(filtered);
        });
    }

    // Acción desde la tabla
    if (userTableBody) {
        userTableBody.addEventListener('click', (e) => {
            const deactivateBtn = e.target.closest('.deactivate-btn');
            if (deactivateBtn) {
                userToDelete = {
                    id: deactivateBtn.getAttribute('data-id'),
                    name: deactivateBtn.getAttribute('data-name'),
                    button: deactivateBtn
                };
                confirmDeactivateNameEl.textContent = userToDelete.name;
                confirmDeactivateModal.classList.remove('hidden');
                return;
            }

            const editBtn = e.target.closest('.edit-user-btn');
            if (editBtn) {
                const id = editBtn.getAttribute('data-id');
                const user = allUsers.find(u => u.id_usuario.toString() === id);
                if (user) {
                    deactivateUserModal.classList.add('hidden');
                    openUserForm(user);
                }
            }
        });
    }

    // Cerrar Modal de Confirmación
    if (cancelDeactivateBtn) {
        cancelDeactivateBtn.addEventListener('click', () => {
            confirmDeactivateModal.classList.add('hidden');
            userToDelete = null;
        });
    }

    // Ejecutar Baja Final
    if (finalConfirmDeactivateBtn) {
        finalConfirmDeactivateBtn.addEventListener('click', async () => {
            if (!userToDelete) return;

            const { id, name, button } = userToDelete;
            
            finalConfirmDeactivateBtn.disabled = true;
            finalConfirmDeactivateBtn.innerHTML = '<i class="fas fa-circle-notch animate-spin"></i> Procesando...';

            try {
                const response = await fetch('/api/baja-usuario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token,
                        id_usuario: id
                    })
                });

                if (response.ok) {
                    notificationTitle.textContent = "¡Baja Confirmada!";
                    notificationMessage.innerHTML = `El usuario <strong>${name}</strong> ha sido dado de baja correctamente.`;
                    confirmDeactivateModal.classList.add('hidden');
                    deactivateUserModal.classList.add('hidden');
                    notificationModal.classList.remove('hidden');
                } else {
                    const errorResult = await response.json().catch(() => ({}));
                    throw new Error(errorResult.message || 'Error al procesar la baja.');
                }
            } catch (error) {
                console.error('Error en la baja:', error);
                alert(error.message);
            } finally {
                finalConfirmDeactivateBtn.disabled = false;
                finalConfirmDeactivateBtn.innerHTML = 'Confirmar Baja';
                userToDelete = null;
            }
        });
    }

    // --- LÓGICA DE BAJA DE CATÁLOGO ---
    const deactivateCatalogModal = document.getElementById('deactivateCatalogModal');
    const closeDeactivateCatalogModalBtn = document.getElementById('closeDeactivateCatalogModalBtn');
    const catalogSearchInput = document.getElementById('catalogSearchInput');
    const catalogTableBody = document.getElementById('catalogTableBody');
    const catalogDeactivateError = document.getElementById('catalogDeactivateError');
    const catalogDeactivateErrorMessage = document.getElementById('catalogDeactivateErrorMessage');

    // Confirmación Custom Catálogo
    const confirmCatalogDeactivateModal = document.getElementById('confirmCatalogDeactivateModal');
    const confirmCatalogNameEl = document.getElementById('confirmCatalogName');
    const finalConfirmCatalogBtn = document.getElementById('finalConfirmCatalogBtn');
    const cancelCatalogDeactivateBtn = document.getElementById('cancelCatalogDeactivateBtn');
    let catalogToDelete = null;

    let allCatalogs = [];
    let catalogListMode = 'deactivate'; // 'deactivate' | 'edit'

    const fetchAndRenderListarCatalogo = async () => {
        try {
            const response = await fetch('/api/listar-catalogo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('No se pudo obtener el catálogo.');

            const data = await response.json();
            const items = Array.isArray(data) ? data : (data.data || data.catalogos || []);

            if (items.length === 0) {
                listarCatalogTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="px-4 py-12 text-center text-slate-400 text-xs">No se encontraron catálogos.</td>
                    </tr>`;
                return;
            }

            listarCatalogTableBody.innerHTML = items.map(item => {
                const iconHtml = (item.imagen && (item.imagen.startsWith('http') || item.imagen.startsWith('data:')))
                    ? `<img src="${item.imagen}" class="w-8 h-8 object-cover rounded-lg" alt="">`
                    : `<i class="${item.imagen || 'fas fa-box'} text-xs"></i>`;
                return `
                <tr class="hover:bg-slate-50/50 transition-colors">
                    <td class="px-4 py-4">
                        <div class="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500 overflow-hidden">
                            ${iconHtml}
                        </div>
                    </td>
                    <td class="px-4 py-4">
                        <span class="text-sm font-bold text-slate-900">${item.nombre}</span>
                    </td>
                    <td class="px-4 py-4">
                        <p class="text-xs text-slate-500 line-clamp-2 max-w-[250px]">${item.descripcion || 'Sin descripción.'}</p>
                    </td>
                    <td class="px-4 py-4">
                        <code class="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg break-all max-w-[250px] inline-block">${item.direccion_enlace || '—'}</code>
                    </td>
                </tr>`;
            }).join('');
        } catch (error) {
            console.error('Error al listar catálogos:', error);
            listarCatalogError.classList.remove('hidden');
            listarCatalogErrorMessage.textContent = error.message;
            listarCatalogTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-8 text-center text-red-400 text-xs">Error al cargar datos.</td>
                </tr>`;
        }
    };

    const fetchAndRenderCatalogs = async () => {
        catalogTableBody.innerHTML = `
            <tr>
                <td colspan="3" class="px-4 py-12 text-center text-slate-400">
                    <i class="fas fa-circle-notch animate-spin text-2xl mb-2"></i>
                    <p class="text-xs">Cargando catálogo...</p>
                </td>
            </tr>
        `;
        catalogDeactivateError.classList.add('hidden');

        try {
            const response = await fetch('/api/listar-catalogo', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Extracción robusta del array de catálogos
                allCatalogs = Array.isArray(data) ? data : (data.data || data.catalogos || []);
                renderCatalogTable(allCatalogs);
            } else {
                throw new Error('No se pudo obtener el catálogo maestro.');
            }
        } catch (error) {
            console.error('Error al listar catálogos:', error);
            catalogDeactivateError.classList.remove('hidden');
            catalogDeactivateErrorMessage.textContent = error.message;
            catalogTableBody.innerHTML = `<tr><td colspan="3" class="px-4 py-8 text-center text-red-400 text-xs">Error al cargar datos.</td></tr>`;
        }
    };

    const renderCatalogTable = (items) => {
        if (items.length === 0) {
            catalogTableBody.innerHTML = `<tr><td colspan="3" class="px-4 py-8 text-center text-slate-400 text-xs">No se encontraron catálogos.</td></tr>`;
            return;
        }

        catalogTableBody.innerHTML = items.map(item => {
            const isEditMode = catalogListMode === 'edit';
            return `
            <tr class="hover:bg-slate-50/50 transition-colors group">
                <td class="px-4 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 overflow-hidden">
                            ${(item.imagen && (item.imagen.startsWith('http') || item.imagen.startsWith('data:'))) 
                                ? `<img src="${item.imagen}" class="w-full h-full object-cover" alt="">`
                                : `<i class="${item.imagen || 'fas fa-box'} text-xs"></i>`}
                        </div>
                        <span class="text-sm font-bold text-slate-900">${item.nombre}</span>
                    </div>
                </td>
                <td class="px-4 py-4">
                    <p class="text-xs text-slate-500 line-clamp-1 max-w-[200px]">${item.descripcion || 'Sin descripción.'}</p>
                </td>
                <td class="px-4 py-4 text-right">
                    ${isEditMode
                        ? `<button class="edit-cat-btn px-4 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg text-[10px] font-bold transition-all" 
                            data-id="${item.id_catalogo || item.id}" data-name="${item.nombre}">
                            <i class="fas fa-edit mr-1"></i>Editar
                        </button>`
                        : `<button class="deactivate-cat-btn px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-[10px] font-bold transition-all" 
                            data-id="${item.id_catalogo || item.id}" data-name="${item.nombre}">
                            Dar de baja
                        </button>`
                    }
                </td>
            </tr>`;
        }).join('');
    };

    // Buscador Catálogo
    if (catalogSearchInput) {
        catalogSearchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allCatalogs.filter(c => 
                c.nombre.toLowerCase().includes(term) || 
                (c.descripcion && c.descripcion.toLowerCase().includes(term))
            );
            renderCatalogTable(filtered);
        });
    }

    // Acción de Baja desde la tabla catálogo
    if (catalogTableBody) {
        catalogTableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.deactivate-cat-btn');
            if (btn) {
                catalogToDelete = {
                    id: btn.getAttribute('data-id'),
                    name: btn.getAttribute('data-name')
                };
                confirmCatalogNameEl.textContent = catalogToDelete.name;
                confirmCatalogDeactivateModal.classList.remove('hidden');
                return;
            }

            const editBtn = e.target.closest('.edit-cat-btn');
            if (editBtn) {
                const id = editBtn.getAttribute('data-id');
                const cat = allCatalogs.find(c => (c.id_catalogo || c.id).toString() === id);
                if (cat) {
                    deactivateCatalogModal.classList.add('hidden');
                    openCatalogForm(cat);
                }
            }
        });
    }

    // Cerrar Modales Catálogo
    if (closeDeactivateCatalogModalBtn) {
        closeDeactivateCatalogModalBtn.addEventListener('click', () => {
            deactivateCatalogModal.classList.add('hidden');
            catalogSearchInput.value = '';
        });
    }

    if (cancelCatalogDeactivateBtn) {
        cancelCatalogDeactivateBtn.addEventListener('click', () => {
            confirmCatalogDeactivateModal.classList.add('hidden');
            catalogToDelete = null;
        });
    }

    // Ejecutar Baja Catálogo Final
    if (finalConfirmCatalogBtn) {
        finalConfirmCatalogBtn.addEventListener('click', async () => {
            if (!catalogToDelete) return;

            finalConfirmCatalogBtn.disabled = true;
            finalConfirmCatalogBtn.innerHTML = '<i class="fas fa-circle-notch animate-spin"></i> Procesando...';

            try {
                const response = await fetch('/api/baja-catalogo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token,
                        id_catalogo: parseInt(catalogToDelete.id)
                    })
                });

                const result = await response.json().catch(() => ({}));
                
                // Éxito si la respuesta es OK, o si trae status: "success" o codigo: "1"
                const isSuccess = response.ok || result.status === "success" || result.codigo === "1" || (Array.isArray(result) && result[0]?.success);

                if (isSuccess) {
                    notificationTitle.textContent = "¡Catálogo Retirado!";
                    notificationMessage.innerHTML = `La herramienta <strong>${catalogToDelete.name}</strong> ha sido eliminada del catálogo correctamente.`;
                    
                    // Actualizar lista local y UI al instante
                    allCatalogs = allCatalogs.filter(c => (c.id_catalogo || c.id).toString() !== catalogToDelete.id.toString());
                    renderCatalogTable(allCatalogs);

                    confirmCatalogDeactivateModal.classList.add('hidden');
                    deactivateCatalogModal.classList.add('hidden');
                    notificationModal.classList.remove('hidden');
                } else {
                    throw new Error(result.mensaje || 'El servidor no pudo procesar la baja.');
                }
            } catch (error) {
                console.error('Error en la baja catálogo:', error);
                alert(error.message);
            } finally {
                finalConfirmCatalogBtn.disabled = false;
                finalConfirmCatalogBtn.innerHTML = 'Confirmar Retirada';
                catalogToDelete = null;
            }
        });
    }

    // --- LÓGICA DE CREACIÓN DE USUARIO ---
    const createUserModal = document.getElementById('createUserModal');
    const closeCreateUserModalBtn = document.getElementById('closeCreateUserModalBtn');
    const createUserForm = document.getElementById('createUserForm');
    const saveUserBtn = document.getElementById('saveUserBtn');
    const createUserFormError = document.getElementById('createUserFormError');
    const createUserFormErrorMessage = document.getElementById('createUserFormErrorMessage');

    // Helper para abrir formulario de usuario con datos (crear o editar)
    const openUserForm = (user) => {
        editingUser = user;
        document.getElementById('user_nombre').value = user.nombre || '';
        document.getElementById('user_apellido').value = user.apellido || '';
        document.getElementById('user_correo').value = user.correo || '';
        document.getElementById('user_usuario').value = user.usuario || '';
        document.getElementById('user_contraseya').value = '';
        document.getElementById('user_rol').value = user.rol || 0;

        createUserModal.querySelector('h3').textContent = 'Editar Usuario';
        createUserModal.querySelector('.text-xs').textContent = 'Modifica los datos del usuario';
        saveUserBtn.innerHTML = '<i class="fas fa-save"></i><span>Guardar Cambios</span>';
        createUserFormError.classList.add('hidden');
        createUserModal.classList.remove('hidden');
    };

    if (closeCreateUserModalBtn) {
        closeCreateUserModalBtn.addEventListener('click', () => {
            createUserModal.classList.add('hidden');
            createUserForm.reset();
            createUserFormError.classList.add('hidden');
            editingUser = null;
        });
    }

    if (createUserForm) {
        createUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nombreVal = document.getElementById('user_nombre').value.trim();
            const apellidoVal = document.getElementById('user_apellido').value.trim();
            const correoVal = document.getElementById('user_correo').value.trim();
            const usuarioVal = document.getElementById('user_usuario').value.trim();
            const contraseyaVal = document.getElementById('user_contraseya').value.trim();
            const rolVal = parseInt(document.getElementById('user_rol').value);

            const data = {
                token: token,
                nombre: nombreVal,
                apellido: apellidoVal,
                correo: correoVal,
                usuario: usuarioVal,
                contraseya: contraseyaVal,
                rol: rolVal,
                es_activo: 1
            };

            const isEditing = editingUser !== null;
            if (isEditing) {
                data.datos = {
                    id_usuario: editingUser.id_usuario,
                    nombre: nombreVal,
                    apellido: apellidoVal,
                    correo: correoVal,
                    usuario: usuarioVal,
                    contraseya: contraseyaVal,
                    rol: rolVal
                };
                delete data.nombre;
                delete data.apellido;
                delete data.correo;
                delete data.usuario;
                delete data.contraseya;
                delete data.rol;
                delete data.es_activo;
            }

            saveUserBtn.disabled = true;
            const originalBtnContent = saveUserBtn.innerHTML;
            saveUserBtn.innerHTML = `<i class="fas fa-circle-notch animate-spin"></i><span>${isEditing ? 'Guardando...' : 'Creando...'}</span>`;
            createUserFormError.classList.add('hidden');

            try {
                const endpoint = isEditing ? 'editar-usuario' : 'alta-usuario';
                const response = await fetch(`/api/${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json().catch(() => ({}));
                const isSuccess = response.ok || result.codigo === "1" || result.status === "success";

                if (isSuccess) {
                    createUserModal.classList.add('hidden');
                    createUserForm.reset();
                    editingUser = null;

                    const msg = isEditing
                        ? `El usuario <strong>${nombreVal}</strong> ha sido actualizado correctamente.`
                        : `El usuario <strong>${nombreVal}</strong> ha sido registrado correctamente.`;
                    
                    notificationTitle.textContent = isEditing ? "¡Usuario Actualizado!" : "¡Usuario Creado!";
                    notificationMessage.innerHTML = msg;
                    notificationModal.classList.remove('hidden');
                } else {
                    throw new Error(result.mensaje || result.message || 'Error en el servidor.');
                }
            } catch (error) {
                console.error('Error al crear usuario:', error);
                createUserFormError.classList.remove('hidden');
                createUserFormErrorMessage.textContent = error.message || 'No se pudo conectar con el servidor.';
            } finally {
                saveUserBtn.disabled = false;
                saveUserBtn.innerHTML = originalBtnContent;
            }
        });
    }

    adminButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            
            if (action === 'Crear catálogo') {
                editingCatalog = null;
                catalogModal.querySelector('h3').textContent = 'Nuevo Catálogo';
                catalogModal.querySelector('.text-xs').textContent = 'Añade una herramienta al mercado';
                saveCatalogBtn.innerHTML = '<i class="fas fa-save"></i><span>Guardar Catálogo</span>';
                catalogForm.reset();
                base64Image = null;
                imagePreviewContainer.classList.add('hidden');
                switchImageType('url');
                catalogFormError.classList.add('hidden');
                catalogModal.classList.remove('hidden');
                return;
            }

            if (action === 'Crear usuario') {
                editingUser = null;
                createUserModal.querySelector('h3').textContent = 'Nuevo Usuario';
                createUserModal.querySelector('.text-xs').textContent = 'Registra un nuevo acceso al sistema';
                saveUserBtn.innerHTML = '<i class="fas fa-user-check"></i><span>Guardar Usuario</span>';
                createUserForm.reset();
                createUserFormError.classList.add('hidden');
                createUserModal.classList.remove('hidden');
                return;
            }

            if (action === 'Editar usuario') {
                userListMode = 'edit';
                document.getElementById('userModalTitle').textContent = 'Editar Usuario';
                document.getElementById('userModalSubtitle').textContent = 'Selecciona un usuario para modificar sus datos';
                document.getElementById('userModalIcon').className = 'fas fa-edit text-xl';
                document.getElementById('userModalIconContainer').className = 'w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600';
                deactivateUserModal.classList.remove('hidden');
                userSearchInput.value = '';
                fetchAndRenderUsers();
                return;
            }

            if (action === 'Dar de baja usuario') {
                userListMode = 'deactivate';
                document.getElementById('userModalTitle').textContent = 'Baja de Usuario';
                document.getElementById('userModalSubtitle').textContent = 'Selecciona un usuario para desactivar su acceso';
                document.getElementById('userModalIcon').className = 'fas fa-user-minus text-xl';
                document.getElementById('userModalIconContainer').className = 'w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600';
                deactivateUserModal.classList.remove('hidden');
                userSearchInput.value = '';
                fetchAndRenderUsers();
                return;
            }

            if (action === 'Listar catálogo') {
                listarCatalogModal.classList.remove('hidden');
                listarCatalogError.classList.add('hidden');
                listarCatalogTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="px-4 py-12 text-center text-slate-400">
                            <i class="fas fa-circle-notch animate-spin text-2xl mb-2"></i>
                            <p class="text-xs">Cargando catálogo...</p>
                        </td>
                    </tr>`;
                fetchAndRenderListarCatalogo();
                return;
            }

            if (action === 'Editar catálogo') {
                catalogListMode = 'edit';
                document.getElementById('catalogModalTitle').textContent = 'Editar Catálogo';
                document.getElementById('catalogModalSubtitle').textContent = 'Selecciona una herramienta para editar sus datos';
                document.getElementById('catalogModalIcon').className = 'fas fa-edit text-xl';
                document.getElementById('catalogModalIconContainer').className = 'w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600';
                deactivateCatalogModal.classList.remove('hidden');
                catalogSearchInput.value = '';
                fetchAndRenderCatalogs();
                return;
            }

            if (action === 'Dar de baja catálogo') {
                catalogListMode = 'deactivate';
                document.getElementById('catalogModalTitle').textContent = 'Baja de Catálogo';
                document.getElementById('catalogModalSubtitle').textContent = 'Selecciona un elemento del catálogo para retirarlo';
                document.getElementById('catalogModalIcon').className = 'fas fa-minus-circle text-xl';
                document.getElementById('catalogModalIconContainer').className = 'w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600';
                deactivateCatalogModal.classList.remove('hidden');
                catalogSearchInput.value = '';
                fetchAndRenderCatalogs();
                return;
            }

            notificationTitle.textContent = action;
            notificationMessage.innerHTML = `La funcionalidad para <strong>${action}</strong> estará disponible en la próxima actualización del sistema.`;
            notificationModal.classList.remove('hidden');
        });
    });

    if (closeDeactivateModalBtn) {
        closeDeactivateModalBtn.addEventListener('click', () => {
            deactivateUserModal.classList.add('hidden');
            deactivateFormError.classList.add('hidden');
        });
    }

    // Helper para abrir el formulario con datos (crear o editar)
    const openCatalogForm = (cat) => {
        editingCatalog = cat;
        document.getElementById('cat_nombre').value = cat.nombre || '';
        document.getElementById('cat_descripcion').value = cat.descripcion || '';
        document.getElementById('cat_enlace').value = cat.direccion_enlace || '';

        const img = cat.imagen || '';
        if (img.startsWith('http')) {
            switchImageType('url');
            document.getElementById('cat_imagen').value = img;
        } else if (img.startsWith('data:')) {
            switchImageType('file');
            base64Image = img;
            document.getElementById('imagePreview').src = img;
            document.getElementById('imagePreviewContainer').classList.remove('hidden');
            document.getElementById('fileLabel').textContent = 'Archivo: ' + cat.nombre;
        } else {
            switchImageType('url');
            document.getElementById('cat_imagen').value = img;
        }

        catalogModal.querySelector('h3').textContent = 'Editar Catálogo';
        catalogModal.querySelector('.text-xs').textContent = 'Modifica los datos de la herramienta';
        saveCatalogBtn.innerHTML = '<i class="fas fa-save"></i><span>Guardar Cambios</span>';
        catalogFormError.classList.add('hidden');
        catalogModal.classList.remove('hidden');
    };

    if (closeCatalogModalBtn) {
        closeCatalogModalBtn.addEventListener('click', () => {
            catalogModal.classList.add('hidden');
            catalogForm.reset();
            base64Image = null;
            imagePreviewContainer.classList.add('hidden');
            catalogFormError.classList.add('hidden');
            editingCatalog = null;
        });
    }

    if (closeListarCatalogModalBtn) {
        closeListarCatalogModalBtn.addEventListener('click', () => {
            listarCatalogModal.classList.add('hidden');
            listarCatalogError.classList.add('hidden');
        });
    }

    if (catalogForm) {
        catalogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Captura directa de valores para evitar problemas de "indefinido"
            const nombreVal = document.getElementById('cat_nombre').value.trim();
            const descripcionVal = document.getElementById('cat_descripcion').value.trim();
            const enlaceVal = document.getElementById('cat_enlace').value.trim();
            const urlImagenVal = document.getElementById('cat_imagen').value.trim();
            
            // Validar según el tipo activo
            const imagenFinal = activeImageType === 'file' ? base64Image : urlImagenVal;
            
            if (!nombreVal || !imagenFinal) {
                catalogFormError.classList.remove('hidden');
                catalogFormErrorMessage.textContent = 'Por favor, completa todos los campos obligatorios.';
                return;
            }

            const data = {
                token: token,
                Datos: {
                    nombre: nombreVal,
                    imagen: imagenFinal,
                    descripcion: descripcionVal,
                    direccion_enlace: enlaceVal
                }
            };

            const isEditing = editingCatalog !== null;
            if (isEditing) {
                data.Datos.id_catalogo = editingCatalog.id_catalogo || editingCatalog.id;
            }

            saveCatalogBtn.disabled = true;
            const originalBtnContent = saveCatalogBtn.innerHTML;
            saveCatalogBtn.innerHTML = '<i class="fas fa-circle-notch animate-spin"></i><span>Guardando...</span>';
            catalogFormError.classList.add('hidden');

            try {
                //console.log('Enviando datos al servidor:', data); // Debug para el desarrollador
                
                const endpoint = isEditing ? 'editar-catalogo' : 'alta-catalogo';
                const response = await fetch(`/api/${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json().catch(() => ({}));
                const isSuccess = response.ok || result.codigo === "1" || result.status === "success";

                if (isSuccess) {
                    // Limpieza y éxito
                    catalogModal.classList.add('hidden');
                    catalogForm.reset();
                    base64Image = null;
                    editingCatalog = null;
                    if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
                    
                    const msg = isEditing
                        ? `El catálogo <strong>${nombreVal}</strong> ha sido editado correctamente.`
                        : `El catálogo <strong>${nombreVal}</strong> ha sido creado correctamente.`;
                    
                    notificationTitle.textContent = "¡Éxito!";
                    notificationMessage.innerHTML = msg;
                    notificationModal.classList.remove('hidden');
                } else {
                    throw new Error(result.mensaje || result.message || 'Error en el servidor');
                }
            } catch (error) {
                console.error('Error en la petición:', error);
                catalogFormError.classList.remove('hidden');
                catalogFormErrorMessage.textContent = error.message || 'No se pudo conectar con el servidor.';
            } finally {
                saveCatalogBtn.disabled = false;
                saveCatalogBtn.innerHTML = originalBtnContent;
            }
        });
    }

    if (closeNotificationBtn) {
        closeNotificationBtn.addEventListener('click', () => {
            notificationModal.classList.add('hidden');
        });
    }

    // 5. Lógica de Cierre de Sesión
    const logoutModal = document.getElementById('logoutModal');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');

    if (logoutModal) {
        if (sideLogoutBtn) {
            sideLogoutBtn.addEventListener('click', () => {
                toggleSidebar(false);
                logoutModal.classList.remove('hidden');
            });
        }
        
        cancelLogoutBtn.addEventListener('click', () => logoutModal.classList.add('hidden'));
        logoutModal.addEventListener('click', (e) => { if (e.target === logoutModal) logoutModal.classList.add('hidden'); });

        confirmLogoutBtn.addEventListener('click', async () => {
            confirmLogoutBtn.disabled = true;
            confirmLogoutBtn.innerHTML = '<i class="fas fa-circle-notch animate-spin mr-2"></i>Cerrando...';
            try {
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: token })
                });
                
                const modalInner = logoutModal.querySelector('.relative');
                modalInner.innerHTML = `
                    <div class="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 bg-indigo-50 text-indigo-500 animate-pulse">
                        <i class="fas fa-user-check text-4xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-slate-900 mb-2">¡Hasta pronto!</h3>
                    <p class="text-slate-500 text-base mb-6 leading-relaxed">
                        <span class="font-semibold text-indigo-600">Sesión de administrador finalizada</span>, que tengas un excelente día.
                    </p>
                `;
                
                setTimeout(() => {
                    localStorage.removeItem('jwt_token');
                    localStorage.removeItem('token');
                    localStorage.removeItem('usuario_nombre');
                    window.location.href = '../index.html';
                }, 2000);
            } catch (error) {
                console.error('Error durante el logout:', error);
                localStorage.clear();
                window.location.href = '../index.html';
            }
        });
    }
});
