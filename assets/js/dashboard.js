document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar Autenticación (Intentar ambos nombres de token por compatibilidad)
    let token = localStorage.getItem('token') || localStorage.getItem('jwt_token');
    const userName = localStorage.getItem('usuario_nombre');

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
        console.log(`Debug: getStoredOrJwt - key: ${key}, jwtKey: ${jwtKey}, storedValue: ${stored}`);
        
        if (stored && stored !== 'undefined' && stored !== 'null' && stored !== '') return stored;
        
        // Fallback a JWT (Soportar múltiples nombres de campo como correo/email)
        if (!payloadJwt) {
            console.warn(`Debug: getStoredOrJwt - No payloadJwt available for ${key}`);
            return '';
        }
        
        let value = '';
        if (jwtKey === 'correo') value = payloadJwt.correo || payloadJwt.email || '';
        else if (jwtKey === 'nombre') value = payloadJwt.nombre || payloadJwt.name || '';
        else if (jwtKey === 'apellido') value = payloadJwt.apellido || payloadJwt.lastname || '';
        else if (jwtKey === 'usuario') value = payloadJwt.usuario || payloadJwt.username || '';
        else value = payloadJwt[jwtKey] || '';
        
        console.log(`Debug: getStoredOrJwt - Fallback JWT value for ${jwtKey}: ${value}`);
        return value;
    };

    // 2. Personalizar Bienvenida
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = getStoredOrJwt('usuario_nombre', 'nombre') || 'Usuario';
    }

    // --- LÓGICA DE SIDEBAR Y PERFIL ---
    // ... rest of selectors ...
    const menuBtn = document.getElementById('menuBtn');
    const userSidebar = document.getElementById('userSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sideLogoutBtn = document.getElementById('sideLogoutBtn');
    const sideUserNameEl = document.getElementById('sideUserName');
    const sideUserEmailEl = document.getElementById('sideUserEmail');
    const sideAdminBtn = document.getElementById('sideAdminBtn');

    // --- DECLARACIONES DE ELEMENTOS DEL DOM Y ESTADO ---
    const editProfileBtn = document.getElementById('editProfileBtn');
    const editProfileModal = document.getElementById('editProfileModal');
    const closeEditProfileModalBtn = document.getElementById('closeEditProfileModalBtn');
    const editProfileForm = document.getElementById('editProfileForm');
    const editProfileError = document.getElementById('editProfileError');
    const editProfileErrorMessage = document.getElementById('editProfileErrorMessage');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const confirmEditProfileModal = document.getElementById('confirmEditProfileModal');
    const cancelSaveProfileBtn = document.getElementById('cancelSaveProfileBtn');
    const confirmSaveProfileBtn = document.getElementById('confirmSaveProfileBtn');
    const notificationModal = document.getElementById('notificationModal');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationIcon = document.getElementById('notificationIcon');
    const notificationIconContainer = document.getElementById('notificationIconContainer');
    const closeNotificationBtn = document.getElementById('closeNotificationBtn');
    const catalogSearch = document.getElementById('catalogSearch');
    const appSearch = document.getElementById('appSearch');
    const deleteModal = document.getElementById('deleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const deleteAppNameEl = document.getElementById('deleteAppName');
    const addAppBtn = document.getElementById('addAppBtn');
    const catalogModal = document.getElementById('catalogModal');
    const closeCatalogBtn = document.getElementById('closeCatalogBtn');
    const catalogGrid = document.getElementById('catalogGrid');
    const appsGrid = document.getElementById('appsGrid');
    const loadingModal = document.getElementById('loadingModal');
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

    let fullCatalogData = [];
    let allAppsData = [];
    let appIdToDelete = null;
    localStorage.setItem('appViewMode', 'grid');
    let viewMode = 'grid';

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
            // Cargar datos actuales antes de mostrar
            const nombre = getStoredOrJwt('usuario_nombre', 'nombre') || 'Usuario';
            const email = getStoredOrJwt('usuario_correo', 'correo') || 'correo@ejemplo.com';
            
            if (sideUserNameEl) sideUserNameEl.textContent = nombre;
            if (sideUserEmailEl) sideUserEmailEl.textContent = email;

            toggleSidebar(true);
        });

        closeSidebarBtn.addEventListener('click', () => toggleSidebar(false));
        sidebarOverlay.addEventListener('click', () => toggleSidebar(false));
    }

    // --- VERIFICACIÓN DE ADMINISTRADOR (Actualizada para Sidebar) ---
    const checkAdmin = async () => {
        if (!sideAdminBtn) return;

        // Fallback rápido: si el LocalStorage o el JWT ya dicen que es admin (rol 1)
        const storedRol = localStorage.getItem('usuario_rol');
        if ((storedRol == 1 || storedRol == "1") || (payloadJwt && (payloadJwt.rol == 1 || payloadJwt.rol == "1"))) {
            sideAdminBtn.classList.remove('hidden');
            return;
        }

        try {
            const response = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token })
            });

            if (response.ok) {
                const text = await response.text();
                if (text && text.trim() !== '') {
                    const data = JSON.parse(text);
                    if (data.codigo === "1" || data.codigo === 1 || data.status === "success") {
                        sideAdminBtn.classList.remove('hidden');
                    }
                }
            }
        } catch (error) {
            console.error('Error al verificar permisos de admin:', error);
        }
    };
    checkAdmin();

    // --- LÓGICA DE EDICIÓN DE PERFIL ---
    // ...
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            toggleSidebar(false);
            
            // Pre-rellenar con los datos más recientes del sistema (LocalStorage con fallback de JWT)
            const storedNombre = getStoredOrJwt('usuario_nombre', 'nombre');
            const storedApellido = getStoredOrJwt('usuario_apellido', 'apellido');
            const storedCorreo = getStoredOrJwt('usuario_correo', 'correo');

            document.getElementById('edit_nombre').value = storedNombre;
            document.getElementById('edit_apellido').value = storedApellido;
            document.getElementById('edit_correo').value = storedCorreo;
            
            editProfileModal.classList.remove('hidden');
        });
    }

    if (closeEditProfileModalBtn) {
        closeEditProfileModalBtn.addEventListener('click', () => {
            editProfileModal.classList.add('hidden');
            editProfileForm.reset();
            editProfileError.classList.add('hidden');
        });
    }

    // Interceptar envío del formulario para mostrar confirmación
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            confirmEditProfileModal.classList.remove('hidden');
        });
    }

    if (cancelSaveProfileBtn) {
        cancelSaveProfileBtn.addEventListener('click', () => {
            confirmEditProfileModal.classList.add('hidden');
        });
    }

    if (confirmSaveProfileBtn) {
        confirmSaveProfileBtn.addEventListener('click', async () => {
            confirmEditProfileModal.classList.add('hidden');
            
            const formData = new FormData(editProfileForm);
            
            // Función auxiliar para obtener valor o fallback del localStorage si está vacío/espacios
            const getVal = (name, storageKey) => {
                const val = formData.get(name);
                return (val && val.trim() !== '') ? val.trim() : localStorage.getItem(storageKey);
            };

            const payload = {
                token: token,
                nombre: getVal('nombre', 'usuario_nombre'),
                apellido: getVal('apellido', 'usuario_apellido'),
                correo: getVal('correo', 'usuario_correo')
            };

            saveProfileBtn.disabled = true;
            const originalText = saveProfileBtn.innerHTML;
            saveProfileBtn.innerHTML = '<i class="fas fa-circle-notch animate-spin"></i> Guardando...';
            editProfileError.classList.add('hidden');

            try {
                const response = await fetch('/api/editar-perfil', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json().catch(() => ({}));

                if (response.ok || data.codigo === 1 || data.status === 'success') {
                    // Actualizar localStorage con los nuevos datos
                    if (payload.nombre) localStorage.setItem('usuario_nombre', payload.nombre);
                    if (payload.apellido) localStorage.setItem('usuario_apellido', payload.apellido);
                    if (payload.correo) localStorage.setItem('usuario_correo', payload.correo);
                    if (payload.usuario) localStorage.setItem('usuario_login', payload.usuario);

                    editProfileModal.classList.add('hidden');
                    
                    // Mostrar Éxito
                    notificationTitle.textContent = "¡Perfil Actualizado!";
                    notificationMessage.innerHTML = "Tus cambios se han guardado correctamente. La página se recargará para aplicar los cambios.";
                    notificationIcon.className = "fas fa-check-circle text-3xl";
                    notificationIconContainer.className = "inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-indigo-50 text-indigo-600";
                    notificationModal.classList.remove('hidden');

                    // Recargar después de un momento o al cerrar
                    closeNotificationBtn.onclick = () => window.location.reload();
                } else {
                    throw new Error(data.mensaje || 'No se pudo actualizar el perfil.');
                }
            } catch (error) {
                console.error('Error Edit Profile:', error);
                editProfileError.classList.remove('hidden');
                editProfileErrorMessage.textContent = error.message;
            } finally {
                saveProfileBtn.disabled = false;
                saveProfileBtn.innerHTML = originalText;
            }
        });
    }

    if (closeNotificationBtn) {
        closeNotificationBtn.addEventListener('click', () => {
            notificationModal.classList.add('hidden');
        });
    }

    // Lógica de búsqueda
    if (catalogSearch) {
        catalogSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredItems = fullCatalogData.filter(item => {
                const nombreMatch = item.nombre && item.nombre.toLowerCase().includes(searchTerm);
                const descMatch = item.descripcion && item.descripcion.toLowerCase().includes(searchTerm);
                return nombreMatch || descMatch;
            });
            renderCatalog(filteredItems);
        });
    }

    // Búsqueda en el grid principal
    if (appSearch) {
        appSearch.addEventListener('input', () => filterAndRenderApps());
    }

    if (deleteModal && cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => deleteModal.classList.add('hidden'));
        deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) deleteModal.classList.add('hidden'); });

        confirmDeleteBtn.addEventListener('click', async () => {
            if (!appIdToDelete) return;

            const activeToken = localStorage.getItem('token') || localStorage.getItem('jwt_token');
            
            // Mostrar modal de carga y cerrar el de confirmación
            deleteModal.classList.add('hidden');
            if (loadingModal) loadingModal.classList.remove('hidden');

            try {
                const response = await fetch('/api/crud-app', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${activeToken}`
                    },
                    body: JSON.stringify({
                        token: activeToken,
                        funcion: "Eliminar",
                        Aplicacion: {
                            id_app: appIdToDelete
                        }
                    })
                });

                if (response.ok) {
                    setTimeout(() => fetchApps(), 1000);
                } else {
                    alert("Error en la comunicación con el servidor al eliminar.");
                }
            } catch (error) {
                console.error("Error crítico en el borrado:", error);
            } finally {
                appIdToDelete = null;
            }
        });
    }

    // --- LÓGICA DE CATÁLOGO Y FORMULARIO ---

    if (addAppBtn && catalogModal && closeCatalogBtn) {
        addAppBtn.addEventListener('click', () => {
            catalogModal.classList.remove('hidden');
            fetchCatalog();
        });

        closeCatalogBtn.addEventListener('click', () => {
            catalogModal.classList.add('hidden');
        });

        catalogModal.addEventListener('click', (e) => {
            if (e.target === catalogModal) catalogModal.classList.add('hidden');
        });
    }

    /**
     * Determina si una cadena es una imagen (URL/Base64) o un icono de FontAwesome
     * y devuelve el HTML correspondiente.
     */
    const renderIconOrImage = (source, extraClasses = "") => {
        if (!source) return `<i class="fas fa-box ${extraClasses}"></i>`;
        
        if (source.startsWith('http') || source.startsWith('data:image')) {
            return `<img src="${source}" class="w-full h-full object-cover rounded-lg ${extraClasses}" alt="Icon">`;
        }
        
        return `<i class="${source} ${extraClasses}"></i>`;
    };

    /**
     * Obtiene el catálogo maestro de aplicaciones.
     */
    async function fetchCatalog() {
        try {
            const response = await fetch('/api/listar-catalogo', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                }
            });
            
            const data = await response.json();
            fullCatalogData = Array.isArray(data) ? data : (data.data || data.catalogos || []);
            renderCatalog(fullCatalogData);
            return fullCatalogData;
        } catch (error) {
            console.error('Catalog error:', error);
            return [];
        }
    }

    /**
     * Renderiza el catálogo.
     */
    function renderCatalog(items) {
        catalogGrid.innerHTML = '';
        
        // Opción personalizada
        const customAppCard = document.createElement('div');
        customAppCard.className = 'group bg-indigo-600 p-6 rounded-2xl shadow-lg shadow-indigo-200 cursor-pointer hover:scale-[1.02] transition-all';
        customAppCard.innerHTML = `
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white mb-4">
                <i class="fas fa-plus text-xl"></i>
            </div>
            <h4 class="text-white font-bold mb-2">App Personalizada</h4>
            <p class="text-indigo-100 text-xs leading-relaxed mb-4">Crea una herramienta propia definiendo su dirección web.</p>
        `;
        customAppCard.addEventListener('click', () => showAppForm('Crea', { 
            nombre: 'Nueva App', 
            esPersonalizada: true 
        }));
        catalogGrid.appendChild(customAppCard);

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer';
            card.innerHTML = `
                <div class="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors mb-4 overflow-hidden">
                    ${renderIconOrImage(item.imagen, "text-xl")}
                </div>
                <h4 class="text-slate-900 font-bold mb-2 group-hover:text-indigo-600 transition-colors">${item.nombre}</h4>
                <p class="text-slate-500 text-xs leading-relaxed line-clamp-3 mb-4">${item.descripcion || 'Sin descripción.'}</p>
                <button class="w-full py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    Seleccionar
                </button>
            `;
            card.addEventListener('click', () => showAppForm('Crea', item));
            catalogGrid.appendChild(card);
        });
    }

    /**
     * Muestra el formulario de creación/edición dentro del modal.
     */
    function showAppForm(modo, data) {
        const isEdit = modo === 'Modificar';
        const isCustom = data.esPersonalizada;
        const title = isEdit ? `Editar ${data.nombre || data.titulo}` : (isCustom ? 'Configurar App Personalizada' : `Configurar ${data.nombre}`);
        
        catalogGrid.classList.add('hidden');
        const formContainer = document.getElementById('formContainer');
        formContainer.classList.remove('hidden');
        
        formContainer.innerHTML = `
            <div class="max-w-xl mx-auto w-full">
                <div class="flex items-center gap-4 mb-8">
                    <div class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 overflow-hidden">
                        ${renderIconOrImage(data.imagen, "text-xl")}
                    </div>
                    <div>
                        <h4 class="text-xl font-bold text-slate-900 tracking-tight">${title}</h4>
                        <p class="text-slate-500 text-xs">Completa los datos para habilitar el acceso</p>
                    </div>
                </div>

                <form id="appCrudForm" class="space-y-6">
                    <div>
                        <label for="field_titulo" class="block text-sm font-semibold text-slate-700 mb-2">Título Personalizado</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                                <i class="fas fa-tag"></i>
                            </span>
                            <input type="text" id="field_titulo" name="titulo" value="${isEdit ? (data.titulo || data.nombre) : (isCustom ? '' : data.nombre)}" 
                                class="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm" required>
                        </div>
                    </div>

                    ${isCustom ? `
                    <div>
                        <label for="field_url" class="block text-sm font-semibold text-slate-700 mb-2">URL / Dirección Enlace</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                                <i class="fas fa-link"></i>
                            </span>
                            <input type="url" id="field_url" name="direccion_enlace" value="${isEdit ? (data.direccion_enlace || '') : ''}" 
                                class="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm" placeholder="https://..." required>
                        </div>
                    </div>` : ''}

                    <div>
                        <label for="field_descripcion" class="block text-sm font-semibold text-slate-700 mb-2">Descripción</label>
                        <textarea id="field_descripcion" name="descripcion" 
                            class="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm h-24 resize-none" required>${data.descripcion || ''}</textarea>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label for="field_admin" class="block text-sm font-semibold text-slate-700 mb-2">Usuario</label>
                            <div class="relative">
                                <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                                    <i class="fas fa-user"></i>
                                </span>
                                <input type="text" id="field_admin" name="admin" value="${isEdit ? (data.admin || '') : ''}" 
                                    class="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm" required>
                            </div>
                        </div>
                        <div>
                            <label for="field_pass" class="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
                            <div class="relative">
                                <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                                    <i class="fas fa-lock"></i>
                                </span>
                                <input type="password" id="field_pass" name="contraseya" 
                                    class="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm" 
                                    ${isEdit ? '' : 'required'} placeholder="••••">
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-4 pt-4">
                        <button type="button" id="cancelFormBtn" class="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm">
                            Cancelar
                        </button>
                        <button type="submit" class="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all text-sm transform hover:scale-[1.02] active:scale-[0.98]">
                            ${isEdit ? 'Guardar Cambios' : 'Activar App'}
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('cancelFormBtn').addEventListener('click', () => {
            formContainer.classList.add('hidden');
            catalogGrid.classList.remove('hidden');
        });

        document.getElementById('appCrudForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const admin = formData.get('admin');
            const pass = formData.get('contraseya');

            const appData = {
                token: token,
                funcion: modo,
                Aplicacion: {
                    titulo: formData.get('titulo'),
                    descripcion: formData.get('descripcion'),
                    admin: admin,
                    contraseya: pass
                }
            };

            if (isCustom) {
                appData.Aplicacion.direccion_enlace = formData.get('direccion_enlace');
            } else {
                // Resolver plantilla de URL con credenciales
                let templateUrl = '';
                if (isEdit) {
                    // En edición, buscar la plantilla original del catálogo
                    const catInfo = fullCatalogData.find(c => (c.id_catalogo || c.id) == data.catalogo);
                    templateUrl = catInfo ? catInfo.direccion_enlace : (data.direccion_enlace || '');
                } else {
                    templateUrl = data.direccion_enlace || '';
                }
                appData.Aplicacion.direccion_enlace = templateUrl
                    .replace(/\{usuario\}/g, admin || '')
                    .replace(/\{contraseya\}/g, pass || '');
            }

            if (isEdit) {
                appData.Aplicacion.id_app = data.id_app || data.id;
            } else if (!isCustom) {
                appData.Aplicacion.catalogo = data.id_catalogo || data.id;
            }

            await executeCrud(appData);
        });
    }

    /**
     * Ejecuta las operaciones CRUD contra el backend.
     */
    async function executeCrud(body) {
        if (loadingModal) loadingModal.classList.remove('hidden');

        try {
            const response = await fetch('/api/crud-app', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            
            // Leer el texto primero para comprobar si está vacío
            const text = await response.text();
            console.log('Raw response text:', text); // Debug log
            let res = {};
            if (text && text.trim() !== '') {
                try {
                    res = JSON.parse(text);
                } catch (e) {
                    console.error('Error parseando respuesta JSON:', e);
                    console.error('Response text causing error:', text); // Debug log
                }
            }

            // Considerar éxito si response.ok es true, o si hay indicios de éxito en el JSON (si existe)
            const isSuccess = response.ok || res.status === 'success' || res.codigo === 1 || res.codigo === "1";

            if (isSuccess) {
                if (catalogModal) catalogModal.classList.add('hidden');
                if (deleteModal) deleteModal.classList.add('hidden');
                if (loadingModal) loadingModal.classList.add('hidden');
                
                // Limpiar formulario y restablecer vista de catálogo
                const form = document.getElementById('appCrudForm');
                if (form) form.reset();
                const formContainer = document.getElementById('formContainer');
                if (formContainer) {
                    formContainer.classList.add('hidden');
                    catalogGrid.classList.remove('hidden');
                }
                
                setTimeout(() => fetchApps(), 1000);
                return;
            }

            if (loadingModal) loadingModal.classList.add('hidden');
            alert('Error: ' + (res.message || res.mensaje || 'Error del servidor (sin detalles)'));
            
        } catch (error) {
            console.error('Error detallado en executeCrud:', error);
            if (loadingModal) loadingModal.classList.add('hidden');
            alert('Error de conexión: ' + error.message);
        }
    }

    /**
     * Obtiene la lista de aplicaciones del usuario.
     */
    async function fetchApps() {
        try {
            const response = await fetch('/api/listar-app', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ token: token })
            });

            if (!response.ok) throw new Error('Error al obtener aplicaciones');
            const res = await response.json();
            console.log('Debug: Listado de apps recibido del servidor:', res);
            
            const appsList = Array.isArray(res) ? res : (res.data || res.apps || res.listado || []);
            allAppsData = appsList;
            console.log('Debug: Apps procesadas para renderizar:', appsList);
            
            filterAndRenderApps();
        } catch (error) {
            console.error('Fetch apps error:', error);
            if (loadingModal) loadingModal.classList.add('hidden');
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.innerHTML = '<p class="text-red-400 text-sm font-semibold">Error al cargar aplicaciones. Recarga la página.</p>';
            }
        }
    }

    function formatLastAccess(appId) {
        const ts = localStorage.getItem('lastAccess_' + appId);
        if (!ts) return '<span class="text-slate-300">Nunca</span>';
        const diff = Date.now() - parseInt(ts, 10);
        if (diff < 60000) return '<span class="text-green-500">Ahora</span>';
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `<span class="text-slate-500">hace ${mins} min</span>`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `<span class="text-slate-500">hace ${hours}h</span>`;
        const days = Math.floor(hours / 24);
        return `<span class="text-slate-500">hace ${days}d</span>`;
    }

    /**
     * Filtra apps por el término de búsqueda y renderiza.
     */
    function filterAndRenderApps() {
        const term = appSearch ? appSearch.value.toLowerCase().trim() : '';
        const filtered = term
            ? allAppsData.filter(app => {
                const title = (app.titulo || app.nombre || '').toLowerCase();
                const desc = (app.descripcion || '').toLowerCase();
                return title.includes(term) || desc.includes(term);
              })
            : allAppsData;
        renderApps(filtered);
    }

    /**
     * Renderiza las aplicaciones agrupadas por catálogo.
     */
    function renderApps(apps) {
        if (loadingModal) loadingModal.classList.add('hidden');
        const addAppBtn = document.getElementById('addAppBtn');
        if (!appsGrid || !addAppBtn) return;

        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.classList.add('hidden');

        const existing = appsGrid.querySelectorAll('.app-card, .app-group, .app-grid');
        existing.forEach(el => el.remove());

        const validApps = apps.filter(app => {
            const title = (app.titulo || app.nombre || '').trim();
            return title !== '' && title !== 'Sin título';
        });

        if (!validApps.length) {
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.innerHTML = '<p class="text-slate-400 text-sm font-semibold">No tienes aplicaciones aún. Añade una desde el catálogo.</p>';
            }
            return;
        }

        const container = document.createElement('div');
        container.className = 'app-grid grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-8';
        container.style.display = 'grid';

        validApps.forEach(app => {
            const card = document.createElement('div');
            card.className = 'app-card group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer';

            const displayTitle = app.titulo || app.nombre || 'Aplicación';
            const catInfo = fullCatalogData.find(c => (c.id_catalogo || c.id) == app.catalogo);
            const displayIcon = catInfo ? catInfo.imagen : (app.imagen || app.icono || 'fas fa-rocket');
            const lastAccessHtml = formatLastAccess(app.id_app || app.id);

            card.innerHTML = `
                    <div class="flex items-start justify-between mb-6">
                        <div class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors overflow-hidden">
                            ${renderIconOrImage(displayIcon, "text-xl")}
                        </div>
                        <div class="flex gap-2">
                            <button class="edit-btn text-slate-300 hover:text-indigo-500 transition-colors p-1" title="Editar">
                                <i class="fas fa-edit text-sm"></i>
                            </button>
                            <button class="delete-btn text-slate-300 hover:text-red-500 transition-colors p-1" title="Eliminar">
                                <i class="fas fa-trash-alt text-sm"></i>
                            </button>
                        </div>
                    </div>
                    <h3 class="text-slate-900 font-bold text-lg mb-2 group-hover:text-indigo-600 transition-colors">${displayTitle}</h3>
                    <p class="text-slate-500 text-sm leading-relaxed line-clamp-2">${app.descripcion || 'Sin descripción.'}</p>
                    <div class="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                        <span class="text-[10px] whitespace-nowrap">${lastAccessHtml}</span>
                        <i class="fas fa-arrow-right text-indigo-500 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all"></i>
                    </div>
                `;

            card.addEventListener('click', () => {
                let url = app.direccion_enlace || app.url || '';
                if (!url || url === '#') {
                    alert(`Acceso no configurado para ${displayTitle}`);
                    return;
                }
                url = url.replace(/\{usuario\}/g, app.admin || '');
                localStorage.setItem('lastAccess_' + (app.id_app || app.id), Date.now());
                window.location.href = url;
            });

            card.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                catalogModal.classList.remove('hidden');
                showAppForm('Modificar', { ...app, nombre: displayTitle });
            });

            card.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                appIdToDelete = app.id_app || app.id;
                deleteAppNameEl.textContent = displayTitle;
                deleteModal.classList.remove('hidden');
            });

            container.appendChild(card);
        });

        appsGrid.insertBefore(container, addAppBtn);
    }

    // --- LÓGICA DE CIERRE DE SESIÓN ---
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
                    <div class="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 bg-indigo-50 text-indigo-500">
                        <i class="fas fa-user-check text-4xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-slate-900 mb-2">Sesión Finalizada</h3>
                    <p class="text-slate-500 text-base mb-6 leading-relaxed">
                        Su sesión ha sido cerrada correctamente. <span class="font-semibold text-indigo-600">Gracias por utilizar nuestros servicios</span>.
                    </p>
                `;
                setTimeout(() => {
                    localStorage.removeItem('jwt_token');
                    localStorage.removeItem('token');
                    localStorage.removeItem('usuario_nombre');
                    window.location.href = '../index.html';
                }, 2500);
            } catch (error) {
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('token');
                localStorage.removeItem('usuario_nombre');
                window.location.href = '../index.html';
            }
        });
    }

    // Inicialización del Dashboard
    const initDashboard = async () => {
        // Primero cargar catálogo para tener las imágenes fijas
        await fetchCatalog();
        // Luego cargar las apps del usuario
        await fetchApps();
    };

    initDashboard();
});
