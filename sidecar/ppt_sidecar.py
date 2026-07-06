import json, socket, sys, threading

try:
    import win32com.client
except ImportError:
    print("ERROR: pywin32 not installed", file=sys.stderr)
    sys.exit(1)

HOST, PORT = "127.0.0.1", 47832

class PptController:
    def __init__(self):
        self.ppt_app = None
        self._connect()

    def _connect(self):
        try:
            self.ppt_app = win32com.client.GetActiveObject("PowerPoint.Application")
            return True
        except:
            self.ppt_app = None
            return False

    def is_connected(self):
        if self.ppt_app is None:
            return self._connect()
        try:
            _ = self.ppt_app.Presentations.Count
            return True
        except:
            return self._connect()

    def update_verse(self, reference, text, context=""):
        if not self.is_connected():
            return {"ok": False, "error": "PowerPoint not running"}
        try:
            if self.ppt_app.SlideShowWindows.Count == 0:
                return {"ok": False, "error": "No active slideshow"}
            view = self.ppt_app.SlideShowWindows(1).View
            slide = self.ppt_app.ActivePresentation.Slides(view.CurrentShowPosition)
            target = None
            for shape in slide.Shapes:
                if shape.Name == "LifestoneVerse":
                    target = shape
                    break
            display = reference + "\n\n" + text
            if context:
                display += "\n\n- " + context
            if target:
                target.TextFrame.TextRange.Text = display
                return {"ok": True, "method": "named_shape"}
            else:
                w = self.ppt_app.ActivePresentation.PageSetup.SlideSize.Width
                h = self.ppt_app.ActivePresentation.PageSetup.SlideSize.Height
                tb = slide.Shapes.AddTextbox(1, w*0.1, h*0.55, w*0.8, h*0.35)
                tb.Name = "LifestoneVerse"
                tb.TextFrame.TextRange.Text = display
                tb.TextFrame.TextRange.Font.Size = 28
                tb.TextFrame.TextRange.Font.Name = "Segoe UI"
                tb.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF
                tb.TextFrame.TextRange.ParagraphFormat.Alignment = 2
                tb.TextFrame.WordWrap = True
                tb.Fill.ForeColor.RGB = 0x000000
                tb.Fill.Transparency = 0.3
                tb.Line.Visible = 0
                return {"ok": True, "method": "fallback_shape"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def clear_verse(self):
        if not self.is_connected():
            return {"ok": False, "error": "PowerPoint not connected"}
        try:
            if self.ppt_app.SlideShowWindows.Count == 0:
                return {"ok": False, "error": "No active slideshow"}
            view = self.ppt_app.SlideShowWindows(1).View
            slide = self.ppt_app.ActivePresentation.Slides(view.CurrentShowPosition)
            removed = 0
            for shape in list(slide.Shapes):
                if shape.Name == "LifestoneVerse":
                    shape.Delete()
                    removed += 1
            return {"ok": True, "removed": removed}
        except Exception as e:
            return {"ok": False, "error": str(e)}

def handle_client(conn, controller):
    try:
        data = b""
        while True:
            chunk = conn.recv(8192)
            if not chunk:
                break
            data += chunk
            if b"\n" in data:
                break
        payload = json.loads(data.decode().strip())
        action = payload.get("action", "update")
        if action == "update":
            result = controller.update_verse(payload.get("reference", ""), payload.get("text", ""), payload.get("context", ""))
        elif action == "clear":
            result = controller.clear_verse()
        elif action == "health":
            result = {"ok": controller.is_connected(), "ppt_running": controller.ppt_app is not None}
        else:
            result = {"ok": False, "error": "Unknown action: " + action}
        conn.sendall((json.dumps(result) + "\n").encode())
    except Exception as e:
        conn.sendall((json.dumps({"ok": False, "error": str(e)}) + "\n").encode())
    finally:
        conn.close()

def main():
    controller = PptController()
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((HOST, PORT))
    srv.listen(5)
    print("Lifestone PPT Sidecar on " + HOST + ":" + str(PORT), file=sys.stderr)
    while True:
        conn, _ = srv.accept()
        threading.Thread(target=handle_client, args=(conn, controller), daemon=True).start()

if __name__ == "__main__":
    main()