import { STYLE_ID, PANEL_ID, TOGGLE_ID, TOAST_CONTAINER_ID } from './constants.js';

export function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* ============================================================
       ASMR Tracker — Glassmorphism Dark Theme
       ============================================================ */
    :root{
      --k-glass:rgba(18,20,24,.72);
      --k-glass-heavy:rgba(14,16,20,.88);
      --k-blur:18px;
      --k-border:rgba(255,255,255,.08);
      --k-border-hover:rgba(255,255,255,.16);
      --k-border-focus:rgba(255,255,255,.22);
      --k-text:rgba(255,255,255,.88);
      --k-text-dim:rgba(255,255,255,.45);
      --k-text-faded:rgba(255,255,255,.3);
      --k-accent:#6ec8f5;
      --k-radius:14px;
      --k-radius-sm:10px;
      --k-ease:cubic-bezier(.4,0,.2,1);
    }

    /* === Toggle Button === */
    #${TOGGLE_ID}{
      position:fixed;right:18px;bottom:18px;z-index:99999;
      display:flex;align-items:center;gap:8px;
      padding:10px 20px;border:1px solid var(--k-border);border-radius:50px;
      background:var(--k-glass-heavy);color:var(--k-text);
      backdrop-filter:blur(var(--k-blur));-webkit-backdrop-filter:blur(var(--k-blur));
      cursor:pointer;font-size:14px;font-weight:500;
      box-shadow:0 8px 32px rgba(0,0,0,.4);
      transition:transform .2s var(--k-ease),box-shadow .2s;
    }
    #${TOGGLE_ID}:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,.5)}
    .kuro-toggle-count{
      background:rgba(110,200,245,.15);color:#6ec8f5;
      padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;
    }

    /* === Buttons === */
    .kuro-btn,.kuro-icon-btn{
      display:inline-flex;align-items:center;gap:4px;
      padding:5px 12px;border:1px solid var(--k-border);border-radius:var(--k-radius-sm);
      background:rgba(255,255,255,.04);color:var(--k-text-dim);
      cursor:pointer;font-size:12px;white-space:nowrap;
      transition:all .15s var(--k-ease);
    }
    .kuro-icon-btn{padding:4px 8px;font-size:13px;min-width:28px;justify-content:center}
    .kuro-btn:hover,.kuro-icon-btn:hover{background:rgba(255,255,255,.08);color:var(--k-text);border-color:var(--k-border-hover)}
    .kuro-btn.active,.kuro-icon-btn.active{background:rgba(110,200,245,.12);color:#6ec8f5;border-color:rgba(110,200,245,.3)}
    .kuro-btn:disabled,.kuro-icon-btn:disabled{opacity:.3;pointer-events:none}

    /* === Actions row (inline buttons on page) === */
    .kuro-actions{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;align-items:center}

    /* === Badge dots (multi-playlist indicators) === */
    .kuro-badge-group{display:inline-flex;gap:3px;align-items:center;margin-left:6px;vertical-align:middle}
    .kuro-badge-dot{
      display:inline-flex;align-items:center;justify-content:center;
      font-size:10px;min-width:18px;height:18px;
      padding:0 4px;border-radius:10px;
      color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.4);
      line-height:1;
    }
    .kuro-badge{
      display:inline-block;padding:2px 10px;border-radius:20px;
      font-size:11px;font-weight:600;color:#fff;
      text-shadow:0 1px 2px rgba(0,0,0,.2);
    }

    /* === Visual states on page items === */
    .kuro-tracked{box-shadow:inset 0 0 0 2px rgba(110,200,245,.4);box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--kuro-pl-color, #6ec8f5) 40%, transparent)}
    .kuro-dimmed{opacity:.45}

    /* === Similar title warning === */
    .kuro-similar-hint{
      font-size:11px;color:#e2a93b;
      margin-top:4px;padding:3px 8px;
      background:rgba(226,169,59,.08);
      border:1px solid rgba(226,169,59,.2);
      border-radius:6px;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      max-width:100%;line-height:1.6;cursor:help;
    }

    /* === Inline note on page === */
    .kuro-inline-note{margin-top:6px;display:flex;gap:6px;align-items:flex-start}
    .kuro-inline-note textarea{
      flex:1;min-height:48px;resize:vertical;
      padding:8px 10px;border-radius:var(--k-radius-sm);
      border:1px solid var(--k-border);
      background:rgba(255,255,255,.04);color:var(--k-text);font-size:12px;
    }
    .kuro-inline-note textarea:focus{outline:none;border-color:var(--k-border-focus)}
    .kuro-inline-note button{flex-shrink:0}

    /* === Keyboard shortcut hint === */
    .kuro-kbd-bar{font-size:11px;color:#999;margin-top:6px;line-height:1.8}
    .kuro-kbd-bar kbd{
      display:inline-block;padding:1px 6px;margin:0 2px;
      border:1px solid rgba(255,255,255,.15);border-radius:4px;
      background:rgba(255,255,255,.06);font-family:monospace;font-size:11px;color:#ccc;
    }

    /* === Toast Notifications === */
    #${TOAST_CONTAINER_ID}{
      position:fixed;left:18px;bottom:64px;z-index:100002;
      display:flex;flex-direction:column;gap:8px;pointer-events:none;
    }
    .kuro-toast{
      pointer-events:auto;
      padding:10px 16px;border-radius:var(--k-radius-sm);
      background:var(--k-glass-heavy);color:var(--k-text);
      border:1px solid var(--k-border);
      backdrop-filter:blur(var(--k-blur));-webkit-backdrop-filter:blur(var(--k-blur));
      font-size:13px;display:flex;align-items:center;gap:10px;
      box-shadow:0 8px 32px rgba(0,0,0,.4);
      transform:translateY(20px) scale(.95);opacity:0;
      transition:all .3s var(--k-ease);
    }
    .kuro-toast.show{transform:translateY(0) scale(1);opacity:1}
    .kuro-toast-success{border-left:3px solid #4ade80}
    .kuro-toast-error{border-left:3px solid #f87171}
    .kuro-toast-warning{border-left:3px solid #fbbf24}
    .kuro-toast-info{border-left:3px solid #6ec8f5}
    .kuro-toast-action{
      padding:3px 10px;border:1px solid rgba(110,200,245,.3);border-radius:6px;
      background:rgba(110,200,245,.1);color:#6ec8f5;cursor:pointer;
      font-size:12px;white-space:nowrap;transition:background .15s;
    }
    .kuro-toast-action:hover{background:rgba(110,200,245,.2)}

    /* ============================================================
       Panel
       ============================================================ */
    #${PANEL_ID}{
      position:fixed;right:18px;bottom:64px;z-index:100000;
      width:420px;max-height:75vh;
      display:flex;flex-direction:column;
      background:var(--k-glass-heavy);
      backdrop-filter:blur(var(--k-blur));-webkit-backdrop-filter:blur(var(--k-blur));
      border:1px solid var(--k-border);border-radius:var(--k-radius);
      box-shadow:0 24px 80px rgba(0,0,0,.6);
      color:var(--k-text);font-size:13px;
      transform:translateY(12px) scale(.97);opacity:0;pointer-events:none;
      transition:transform .25s var(--k-ease),opacity .25s;
    }
    #${PANEL_ID}.show{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}
    #${PANEL_ID}.max{width:680px}
    #${PANEL_ID} header{
      display:flex;justify-content:space-between;align-items:center;
      padding:14px 18px;border-bottom:1px solid var(--k-border);
      font-weight:600;font-size:15px;letter-spacing:.3px;
    }
    #${PANEL_ID} .body{
      overflow-y:auto;padding:14px 18px;flex:1;
      scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent;
    }
    #${PANEL_ID} .body::-webkit-scrollbar{width:5px}
    #${PANEL_ID} .body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}
    .kuro-close-btn{
      background:none;border:none;color:var(--k-text-dim);
      font-size:18px;cursor:pointer;padding:0 4px;transition:color .15s;
    }
    .kuro-close-btn:hover{color:var(--k-text)}

    /* === Toolbar === */
    .kuro-toolbar{display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:10px}
    .kuro-toolbar-secondary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
    .kuro-search,.kuro-sort,.kuro-sort-dir{
      padding:7px 12px;border:1px solid var(--k-border);border-radius:var(--k-radius-sm);
      background:rgba(255,255,255,.04);color:var(--k-text);font-size:12px;
    }
    .kuro-search:focus,.kuro-sort:focus,.kuro-sort-dir:focus{outline:none;border-color:var(--k-border-focus)}
    .kuro-sort option,.kuro-sort-dir option{background:#1a1c22;color:#eee}

    /* === Filter Pills === */
    .kuro-filter-pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
    .kuro-pill{
      display:inline-flex;align-items:center;gap:4px;
      padding:4px 12px;border:1px solid var(--k-border);border-radius:20px;
      background:rgba(255,255,255,.03);color:var(--k-text-dim);
      cursor:pointer;font-size:11px;transition:all .15s var(--k-ease);
    }
    .kuro-pill:hover{background:rgba(255,255,255,.06);border-color:var(--k-border-hover)}
    .kuro-pill.active{background:rgba(110,200,245,.1);color:#6ec8f5;border-color:rgba(110,200,245,.25)}
    .kuro-pill-count{
      background:rgba(255,255,255,.06);padding:1px 6px;border-radius:10px;
      font-size:10px;min-width:14px;text-align:center;
    }

    /* === Summary Bar === */
    .kuro-summary-bar{font-size:11px;color:var(--k-text-dim);margin-bottom:10px;line-height:1.6}
    .kuro-stat-bar{display:flex;height:4px;border-radius:2px;overflow:hidden;margin-top:4px;background:rgba(255,255,255,.06)}
    .kuro-stat-segment{height:100%;transition:width .3s var(--k-ease)}

    /* === Advanced Filters === */
    .kuro-advanced-filters{margin-bottom:10px;font-size:12px;color:var(--k-text-dim)}
    .kuro-advanced-filters summary{cursor:pointer;padding:4px 0}
    .kuro-filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
    .kuro-filter-grid label{display:flex;align-items:center;gap:4px;font-size:11px}
    .kuro-filter-grid input[type="date"]{
      padding:4px 8px;border:1px solid var(--k-border);border-radius:6px;
      background:rgba(255,255,255,.04);color:var(--k-text);font-size:11px;width:100%;
    }

    /* === Batch Bar === */
    .kuro-batch-bar{
      display:flex;align-items:center;gap:6px;flex-wrap:wrap;
      padding:8px 12px;margin-bottom:10px;
      background:rgba(110,200,245,.06);border:1px solid rgba(110,200,245,.15);border-radius:var(--k-radius-sm);
    }

    /* === Actions Grid === */
    .kuro-actions-grid{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}

    /* === Progress Bar === */
    .kuro-progress{margin-bottom:12px}
    .kuro-progress-text{font-size:11px;color:var(--k-text-dim);margin-bottom:4px}
    .kuro-progress-bar{height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden}
    .kuro-progress-fill{height:100%;background:#6ec8f5;border-radius:2px;transition:width .3s}

    /* === Empty State === */
    .kuro-empty-state{text-align:center;padding:32px 16px;color:var(--k-text-dim)}
    .kuro-empty-icon{font-size:36px;margin-bottom:12px}
    .kuro-empty-text{font-size:13px;line-height:1.6}

    /* === Item Cards === */
    .kuro-item{
      display:grid;grid-template-columns:70px 1fr;gap:12px;
      padding:12px;margin-bottom:8px;
      border:1px solid var(--k-border);border-radius:var(--k-radius-sm);
      background:rgba(255,255,255,.02);
      transition:border-color .15s,background .15s;
    }
    .kuro-item:hover{border-color:var(--k-border-hover);background:rgba(255,255,255,.04)}
    .kuro-item-manual{grid-template-columns:38px 70px 1fr}
    .kuro-item.expanded .kuro-item-body{
      max-height:600px;opacity:1;padding-top:10px;margin-top:8px;border-top:1px solid var(--k-border);
    }
    .kuro-item-body{max-height:0;opacity:0;overflow:hidden;transition:max-height .3s var(--k-ease),opacity .25s,padding-top .25s,margin-top .25s}
    .kuro-item-summary{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
    .kuro-title-line{
      font-size:13px;font-weight:500;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    }
    .kuro-title-line a{color:var(--k-text);text-decoration:none}
    .kuro-title-line a:hover{text-decoration:underline}
    .kuro-status-line{display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap}
    .kuro-mini{font-size:11px;color:var(--k-text-dim)}
    .kuro-note-preview{font-size:11px;color:var(--k-text-faded);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .kuro-collapse-hint{font-size:11px;flex-shrink:0}
    .kuro-meta{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px}
    .kuro-note-edit{
      width:100%;min-height:56px;resize:vertical;
      padding:8px 10px;border:1px solid var(--k-border);border-radius:var(--k-radius-sm);
      background:rgba(255,255,255,.04);color:var(--k-text);font-size:12px;margin-bottom:8px;
      box-sizing:border-box;
    }
    .kuro-note-edit:focus{outline:none;border-color:var(--k-border-focus)}
    .kuro-row-actions{display:flex;gap:6px;flex-wrap:wrap}

    /* === Order Column === */
    .kuro-order-col{
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    }
    .kuro-order-col .kuro-btn{padding:1px 6px;min-width:0;font-size:11px;line-height:1.3;border-radius:6px}
    .kuro-order-input{width:38px !important;margin:0 !important;padding:2px 4px !important;text-align:center;font-size:11px !important;border-radius:6px !important}

    .kuro-thumb{cursor:pointer;position:relative;
      width:70px;height:56px;
      border-radius:8px;overflow:hidden;
      display:flex;align-items:center;justify-content:center;
      background:rgba(255,255,255,.04);color:var(--k-text-faded);font-size:10px;
      border:2px solid transparent;transition:border-color .15s;
    }
    .kuro-thumb img{width:100%;height:100%;object-fit:cover}
    .kuro-thumb.selected{border-color:#6ec8f5}
    .kuro-item.kuro-dragging{opacity:.4}
    .kuro-item.kuro-drag-over{border-color:#6ec8f5;background:rgba(110,200,245,.06)}

    /* === Import Preview Dialog === */
    .kuro-import-preview{
      position:fixed;inset:0;z-index:100001;
      display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,.5);
      backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
      opacity:0;transition:opacity .25s ease;
    }
    .kuro-import-preview.show{opacity:1}
    .kuro-import-preview-content{
      background:var(--k-glass-heavy);
      backdrop-filter:blur(var(--k-blur));-webkit-backdrop-filter:blur(var(--k-blur));
      border:1px solid var(--k-border);
      border-radius:20px;padding:28px;
      max-width:420px;width:90%;color:var(--k-text);
      box-shadow:0 24px 80px rgba(0,0,0,.6);
    }
    .kuro-import-preview h3{margin:0 0 20px;font-size:16px;font-weight:600;letter-spacing:.3px}
    .kuro-import-stat{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--k-border);font-size:13px;color:var(--k-text-dim)}
    .kuro-import-stat strong{color:var(--k-text)}
    .kuro-import-actions{display:flex;gap:8px;margin-top:20px;justify-content:flex-end}

    /* === Sync UI === */
    .kuro-sync-status{font-size:11px;line-height:28px;padding:0 8px;border-radius:6px;white-space:nowrap}
    .kuro-sync-uploading,.kuro-sync-downloading{color:#6ec8f5;animation:kuro-pulse 1s infinite}
    .kuro-sync-success{color:#4ade80}
    .kuro-sync-error{color:#f87171}
    @keyframes kuro-pulse{0%,100%{opacity:1}50%{opacity:.4}}

    .kuro-sync-dialog{
      position:fixed;inset:0;z-index:100001;
      display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,.5);
      backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
      opacity:0;transition:opacity .25s ease;
    }
    .kuro-sync-dialog.show{opacity:1}
    .kuro-sync-dialog-content{
      background:var(--k-glass-heavy);
      backdrop-filter:blur(var(--k-blur));-webkit-backdrop-filter:blur(var(--k-blur));
      border:1px solid var(--k-border);
      border-radius:20px;padding:28px;
      max-width:480px;width:90%;color:var(--k-text);
      box-shadow:0 24px 80px rgba(0,0,0,.6);
    }
    .kuro-sync-dialog h3{margin:0 0 16px;font-size:16px;font-weight:600;letter-spacing:.3px}
    .kuro-sync-help{font-size:12px;color:var(--k-text-dim);margin-bottom:16px;line-height:1.6}
    .kuro-sync-help p{margin:0 0 8px}
    .kuro-sync-help details{margin-top:8px}
    .kuro-sync-help summary{cursor:pointer;color:var(--k-text);font-weight:500}
    .kuro-sync-help ol{margin:8px 0 0;padding-left:20px}
    .kuro-sync-help li{margin-bottom:4px}
    .kuro-sync-help a{color:#6ec8f5;text-decoration:underline}
    .kuro-sync-help code{background:rgba(255,255,255,.08);padding:1px 5px;border-radius:4px;font-size:11px}
    .kuro-sync-label{display:block;margin-bottom:14px;font-size:13px;color:var(--k-text-dim)}
    .kuro-sync-label .kuro-mini{font-size:11px;color:var(--k-text-dim);opacity:.7}
    .kuro-sync-input{
      display:block;width:100%;margin-top:6px;padding:8px 12px;
      border:1px solid var(--k-border);border-radius:10px;
      background:rgba(255,255,255,.05);color:var(--k-text);
      font-size:13px;font-family:monospace;box-sizing:border-box;
    }
    .kuro-sync-input:focus{outline:none;border-color:var(--k-border-focus)}
    .kuro-sync-checkbox-label{display:flex;align-items:center;gap:8px;cursor:pointer}
    .kuro-sync-checkbox-label input{margin:0}
    .kuro-sync-dialog-actions{display:flex;gap:8px;margin-top:20px;justify-content:flex-end;flex-wrap:wrap}
    .kuro-btn-primary{background:rgba(110,200,245,.2) !important;border-color:rgba(110,200,245,.4) !important;color:#6ec8f5 !important;font-weight:600}
    .kuro-btn-primary:hover{background:rgba(110,200,245,.3) !important}

    /* === Playlist Manager Modal === */
    .kuro-pl-manager{
      position:fixed;inset:0;z-index:100001;
      display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,.55);
      backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
      opacity:0;transition:opacity .25s ease;
    }
    .kuro-pl-manager.show{opacity:1}
    .kuro-pl-manager-content{
      background:var(--k-glass-heavy);
      backdrop-filter:blur(var(--k-blur));-webkit-backdrop-filter:blur(var(--k-blur));
      border:1px solid var(--k-border);
      border-radius:20px;padding:0;
      max-width:440px;width:90%;color:var(--k-text);
      box-shadow:0 24px 80px rgba(0,0,0,.6);
      overflow:hidden;
    }
    .kuro-plm-header{
      display:flex;justify-content:space-between;align-items:center;
      padding:20px 24px 16px;
    }
    .kuro-plm-header h3{margin:0;font-size:16px;font-weight:600;letter-spacing:.3px}
    .kuro-pl-list{padding:0 16px;max-height:320px;overflow-y:auto;
      scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent;
    }
    .kuro-pl-list::-webkit-scrollbar{width:4px}
    .kuro-pl-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}

    .kuro-plm-item{
      display:flex;align-items:center;gap:12px;
      padding:10px 8px;border-radius:10px;
      transition:background .15s var(--k-ease), opacity .15s, transform .15s;
      position:relative;
      cursor:grab;
    }
    .kuro-plm-item:hover{background:rgba(255,255,255,.04)}
    .kuro-plm-item.kuro-plm-dragging{opacity:.4;transform:scale(.97)}
    .kuro-plm-item.kuro-plm-drag-over{
      background:rgba(255,255,255,.08);
      box-shadow:0 -2px 0 0 var(--k-accent) inset;
    }
    .kuro-plm-drag-handle{
      flex-shrink:0;font-size:14px;color:var(--k-text-dim);
      cursor:grab;user-select:none;opacity:.4;
      transition:opacity .15s;padding:0 2px;
    }
    .kuro-plm-item:hover .kuro-plm-drag-handle{opacity:.8}
    .kuro-plm-color-bar{
      width:4px;height:32px;border-radius:2px;flex-shrink:0;
      transition:background .2s;
    }
    .kuro-plm-info{flex:1;min-width:0}
    .kuro-plm-name-row{display:flex;align-items:center;gap:8px}
    .kuro-plm-icon{
      font-size:18px;cursor:pointer;
      transition:transform .15s;
      flex-shrink:0;
    }
    .kuro-plm-icon:hover{transform:scale(1.2)}
    .kuro-plm-name{
      font-size:14px;font-weight:500;color:var(--k-text);
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    }
    .kuro-plm-count{
      font-size:11px;color:var(--k-text-dim);
      background:rgba(255,255,255,.06);
      padding:2px 8px;border-radius:10px;
      flex-shrink:0;white-space:nowrap;
    }
    .kuro-plm-actions{
      display:flex;gap:2px;flex-shrink:0;
      opacity:0;transition:opacity .15s;
    }
    .kuro-plm-item:hover .kuro-plm-actions{opacity:1}
    .kuro-plm-action-btn{
      display:flex;align-items:center;justify-content:center;
      width:30px;height:30px;border-radius:8px;
      border:none;background:none;
      cursor:pointer;font-size:14px;
      transition:background .15s;
      position:relative;
    }
    .kuro-plm-action-btn:hover{background:rgba(255,255,255,.1)}
    .kuro-plm-action-danger:hover{background:rgba(248,113,113,.15)}
    .kuro-plm-empty{
      text-align:center;padding:24px 16px;
      color:var(--k-text-dim);font-size:13px;
    }
    .kuro-plm-divider{
      height:1px;margin:4px 24px 0;
      background:var(--k-border);
    }
    .kuro-plm-add-section{padding:16px 24px 20px}
    .kuro-plm-add-title{font-size:12px;color:var(--k-text-dim);margin-bottom:10px;font-weight:500}
    .kuro-plm-add-form{display:flex;flex-direction:column;gap:10px}
    .kuro-pl-new-name{
      padding:9px 14px;border:1px solid var(--k-border);border-radius:10px;
      background:rgba(255,255,255,.04);color:var(--k-text);font-size:13px;
      width:100%;box-sizing:border-box;
    }
    .kuro-pl-new-name:focus{outline:none;border-color:var(--k-border-focus)}
    .kuro-plm-add-options{display:flex;gap:8px;align-items:center;justify-content:space-between}
    .kuro-plm-color-label{
      display:flex;align-items:center;gap:8px;cursor:pointer;
      padding:6px 12px;border:1px solid var(--k-border);border-radius:8px;
      background:rgba(255,255,255,.04);font-size:12px;color:var(--k-text-dim);
      transition:border-color .15s;
    }
    .kuro-plm-color-label:hover{border-color:var(--k-border-hover)}
    .kuro-plm-color-preview{
      width:16px;height:16px;border-radius:50%;
      border:2px solid rgba(255,255,255,.15);
      flex-shrink:0;transition:background .15s;
    }
    .kuro-plm-color-label input[type="color"]{position:absolute;width:0;height:0;opacity:0;pointer-events:none}
    .kuro-plm-add-btn{font-weight:600 !important;padding:7px 20px !important}
    .kuro-plm-add-name-row{display:flex;gap:8px;align-items:center}
    .kuro-plm-add-name-row .kuro-pl-new-name{flex:1}
    .kuro-plm-add-icon{
      width:40px;height:40px;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
      font-size:20px;border:1px solid var(--k-border);border-radius:10px;
      background:rgba(255,255,255,.04);cursor:pointer;
      transition:border-color .15s,background .15s;
    }
    .kuro-plm-add-icon:hover{border-color:var(--k-border-hover);background:rgba(255,255,255,.08)}

    /* === Emoji Picker === */
    .kuro-emoji-picker{
      position:fixed;z-index:100010;
      width:300px;
      background:var(--k-glass-heavy);
      backdrop-filter:blur(var(--k-blur));-webkit-backdrop-filter:blur(var(--k-blur));
      border:1px solid var(--k-border);border-radius:14px;
      box-shadow:0 16px 48px rgba(0,0,0,.6);
      overflow:hidden;
      animation:kuro-ep-in .15s ease;
    }
    @keyframes kuro-ep-in{from{opacity:0;transform:translateY(-6px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
    .kuro-ep-tabs{
      display:flex;gap:0;overflow-x:auto;
      border-bottom:1px solid var(--k-border);
      scrollbar-width:none;
    }
    .kuro-ep-tabs::-webkit-scrollbar{display:none}
    .kuro-ep-tab{
      padding:8px 10px;border:none;background:none;
      color:var(--k-text-dim);font-size:11px;cursor:pointer;
      white-space:nowrap;border-bottom:2px solid transparent;
      transition:color .15s,border-color .15s;
    }
    .kuro-ep-tab:hover{color:var(--k-text)}
    .kuro-ep-tab.active{color:#6ec8f5;border-bottom-color:#6ec8f5}
    .kuro-ep-grid{
      display:grid;grid-template-columns:repeat(8,1fr);
      gap:2px;padding:10px;
      max-height:200px;overflow-y:auto;
      scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent;
    }
    .kuro-ep-grid::-webkit-scrollbar{width:4px}
    .kuro-ep-grid::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}
    .kuro-ep-emoji{
      display:flex;align-items:center;justify-content:center;
      width:100%;aspect-ratio:1;font-size:20px;
      border:none;background:none;border-radius:8px;
      cursor:pointer;transition:background .1s,transform .1s;
    }
    .kuro-ep-emoji:hover{background:rgba(255,255,255,.1);transform:scale(1.15)}
    .kuro-ep-emoji.active{background:rgba(110,200,245,.15);box-shadow:inset 0 0 0 2px rgba(110,200,245,.3)}

    /* === Pager === */
    .kuro-pager{display:none;justify-content:center;align-items:center;gap:12px;padding-top:4px}
    .kuro-page-info{font-size:12px;color:var(--k-text-dim)}

    /* === Mobile responsive === */
    @media(max-width:640px){
      #${PANEL_ID}{right:8px;left:8px;bottom:56px;width:auto;max-height:80vh;border-radius:16px}
      #${PANEL_ID}.max{width:auto}
      #${PANEL_ID} .body{padding:12px 14px}
      #${TOGGLE_ID}{right:10px;bottom:10px;padding:9px 16px;font-size:13px}
      .kuro-toolbar{grid-template-columns:1fr;gap:6px}
      .kuro-toolbar-secondary{grid-template-columns:1fr 1fr;gap:6px}
      .kuro-filter-pills{gap:4px}
      .kuro-pill{padding:3px 9px;font-size:10px}
      .kuro-item{grid-template-columns:50px 1fr;gap:8px;padding:10px}
      .kuro-item-manual{grid-template-columns:30px 50px 1fr}
      .kuro-order-col .kuro-btn{padding:1px 5px;font-size:10px}
      .kuro-thumb{width:50px;height:42px}
      .kuro-actions-grid{gap:6px}
    }
  `;
  document.head.appendChild(style);
}
