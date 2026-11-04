import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { jobs } from "../../services/domain";
import StatusBadge from "../../components/StatusBadge";
import { money, timeAgo } from "../../utils/helpers";

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await jobs.get(id);
        setJob(data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load job"
        );
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [id]);

  const handleCancel = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this job?"
    );

    if (!confirmed) return;

    try {
      setCancelling(true);

      const updatedJob = await jobs.cancel(id);
      setJob(updatedJob);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to cancel job"
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="page container narrow">
        <div className="card card-pad">
          <p className="muted">Loading job...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="page container narrow">
        <div className="page-title">
          <div>
            <span className="eyebrow">JOB DETAILS</span>
            <h1>Unable to load job</h1>
            <p>{error || "Job not found."}</p>
          </div>
        </div>

        <Link to="/client/jobs" className="btn btn-outline">
          <i className="fa-solid fa-arrow-left" />
          Back to jobs
        </Link>
      </div>
    );
  }

  const canCancel = ["PENDING", "QUOTING", "ASSIGNED", "IN_PROGRESS"].includes(
    job.status
  );

  return (
    <div className="page container narrow">
      <div className="page-title">
        <div>
          <span className="eyebrow">JOB DETAILS</span>
          <h1>{job.title}</h1>
          <p>View and manage your service request.</p>
        </div>

        <StatusBadge status={job.status} />
      </div>

      <div className="card card-pad">
        <div className="section-row">
          <h3>Job information</h3>

          <span className="muted small">
            Posted {timeAgo(job.createdAt)}
          </span>
        </div>

        <div className="grid g2 gap-3">
          <div>
            <span className="eyebrow">CATEGORY</span>
            <p>{job.category || "—"}</p>
          </div>

          <div>
            <span className="eyebrow">CITY</span>
            <p>{job.city || "—"}</p>
          </div>

          <div>
            <span className="eyebrow">BUDGET</span>
            <p className="mono">{money(job.budget)}</p>
          </div>

          <div>
            <span className="eyebrow">STATUS</span>
            <p>
              <StatusBadge status={job.status} />
            </p>
          </div>
        </div>
      </div>

      <div className="card card-pad mt-6">
        <h3>Description</h3>

        <p className="muted">
          {job.description || "No description provided."}
        </p>
      </div>

      <div className="card card-pad mt-6">
        <div className="section-row">
          <h3>Assigned worker</h3>
        </div>

        {job.assignedWorker ? (
          <div>
            <p>
              <strong>{job.assignedWorker.name}</strong>
            </p>

            <p className="muted">
              {job.assignedWorker.email}
            </p>
          </div>
        ) : (
          <div className="empty">
            <i className="fa-solid fa-user-slash" />
            <span>No worker has been assigned yet.</span>
          </div>
        )}
      </div>

      {error && (
        <div className="form-error mt-6">
          {error}
        </div>
      )}

      <div className="form-actions mt-6">
        <Link to="/client/jobs" className="btn btn-outline">
          <i className="fa-solid fa-arrow-left" />
          Back to jobs
        </Link>

        {canCancel && (
          <button
            className="btn btn-outline"
            onClick={handleCancel}
            disabled={cancelling}
          >
            <i className="fa-solid fa-xmark" />
            {cancelling ? "Cancelling..." : "Cancel job"}
          </button>
        )}

        <button
          className="btn btn-primary"
          onClick={() => navigate("/client/jobs")}
        >
          My jobs
        </button>
      </div>
    </div>
  );
}