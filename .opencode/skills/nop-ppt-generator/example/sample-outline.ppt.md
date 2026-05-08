<!--
  Example Outline for ppt-generator-skill

  This outline demonstrates the expected input format.
  Each <section> becomes one slide. The skill's sub-agents
  will transform this into a polished presentation using
  the template components (icon-list, card-grid, stat-grid, etc.)
-->
<section>
  <h1>Project X<br/><span>Technical Overview</span></h1>
  <p class="subtitle">Building the next generation platform</p>
  <p class="author">Author Name | June 2026</p>
</section>

<section>
  <h2>Agenda</h2>
  <ul>
    <li>Background & Motivation</li>
    <li>Architecture Design</li>
    <li>Key Technologies</li>
    <li>Development Process</li>
    <li>Results & Metrics</li>
    <li>Lessons Learned</li>
  </ul>
</section>

<section>
  <h2>Background</h2>
  <ul>
    <li>Existing system had scalability limitations
      <ul>
        <li>Single-process architecture, no horizontal scaling</li>
        <li>Tight coupling between modules</li>
      </ul>
    </li>
    <li>Team needed to deliver 3x features with same headcount</li>
    <li>Performance requirements increased by 10x</li>
  </ul>
</section>

<section>
  <h2>Architecture Overview</h2>
  <p>Core pipeline with clear layer separation:</p>
  <ul>
    <li>Layer 1: Core DSL & Compilation (flux-core → flux-compiler)</li>
    <li>Layer 2: Runtime & State Management (flux-runtime)</li>
    <li>Layer 3: React Integration & Renderers (flux-react)</li>
  </ul>
  <p>Key principle: compile-time computation moves to build phase, runtime only executes pre-compiled artifacts.</p>
</section>

<section>
  <h2>Technology Stack</h2>
  <table>
    <tr><th>Technology</th><th>Version</th><th>Purpose</th></tr>
    <tr><td>React</td><td>19</td><td>UI Framework</td></tr>
    <tr><td>TypeScript</td><td>6.0</td><td>Language</td></tr>
    <tr><td>Zustand</td><td>5</td><td>State Management</td></tr>
    <tr><td>Vite</td><td>8</td><td>Build Tool</td></tr>
    <tr><td>Vitest</td><td>4</td><td>Testing</td></tr>
    <tr><td>Tailwind CSS</td><td>4</td><td>Styling</td></tr>
  </table>
</section>

<section>
  <h2>Project Metrics</h2>
  <ul>
    <li>Total files: 1,200+ TypeScript files</li>
    <li>Effective code: 175K lines</li>
    <li>Test code: 80K lines (test ratio: 0.79)</li>
    <li>Packages: 27 workspace packages</li>
    <li>Development time: 7 weeks</li>
    <li>Documentation: 900+ markdown files</li>
  </ul>
</section>

<section>
  <h2>Development Process</h2>
  <p>AI-assisted development with controlled convergence:</p>
  <ul>
    <li>Phase 1: Architecture baseline definition (attractor engineering)</li>
    <li>Phase 2: Rapid AI expansion with plan-driven convergence</li>
    <li>Phase 3: Deep audit and closure verification</li>
    <li>Phase 4: Long-term memory and bug documentation</li>
  </ul>
</section>

<section>
  <h2>Key Lessons</h2>
  <ul>
    <li>AI generates fast, but without convergence mechanisms, systems drift</li>
    <li>Architecture documents serve as "attractors" that pull the system toward stability</li>
    <li>Plans define result surfaces, not just task lists</li>
    <li>Closure audits must be independent — never let the implementer self-certify</li>
    <li>Development logs are system memory, not just status reports</li>
  </ul>
  <p><strong>Core insight:</strong> AI-assisted development is a dynamical system problem, not a governance problem.</p>
</section>

<section>
  <h1>Q&A</h1>
  <p class="subtitle">Questions & Discussion</p>
  <p class="author">Thank you for your attention</p>
</section>
