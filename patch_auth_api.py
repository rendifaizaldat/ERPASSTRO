with open('apps/backend/src/routes/shared/audit.routes.ts', 'r') as f:
    content = f.read()

# Add a simple authorization middleware to secure the endpoint as per the code review
auth_middleware = """
const auditAuth = (req: Request, res: Response, next: any) => {
  // In a real scenario, this would use a secure token. For the sake of local testing and this refactoring:
  const token = req.headers.authorization;
  if (process.env.NODE_ENV === 'production' && token !== `Bearer ${process.env.AUDIT_SECRET_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized access to audit API" });
  }
  // To avoid unauthenticated database truncations
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development' && !process.env.AUDIT_MODE_ENABLED) {
    return res.status(403).json({ error: "Audit API is only accessible in test or development environments" });
  }
  next();
};

router.use(auditAuth);
"""

if "auditAuth" not in content:
    content = content.replace("const router = Router();", f"const router = Router();\n{auth_middleware}")

with open('apps/backend/src/routes/shared/audit.routes.ts', 'w') as f:
    f.write(content)
