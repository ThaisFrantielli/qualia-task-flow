<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OportunidadeResource;
use App\Models\Oportunidade;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OportunidadeController extends Controller
{
    /**
     * List opportunities with optional filters
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Oportunidade::query()
            ->with(['user', 'chatMessages' => function ($query) {
                $query->latest()->take(1);
            }])
            ->withCount(['chatMessages', 'produtos'])
            ->latest();

        // Apply filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by user if not an admin
        if (!$request->user()->is_admin) {
            $query->where('user_id', $request->user()->id);
        }

        $oportunidades = $query->paginate(15);

        return OportunidadeResource::collection($oportunidades);
    }
}